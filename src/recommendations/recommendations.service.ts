import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { GetBooksQueryDto } from '../books/dto/get-books-query.dto';
import { BookListItemDto } from '../books/dto/book-list-item.dto';
import { RecommendationBotRequestDto } from './dto/recommendation-bot-request.dto';
import { RecommendationItemDto } from './dto/recommendation-item.dto';
import { RecommendationsResponseDto } from './dto/recommendations-response.dto';

type CandidateBook = {
  bookId: number;
  title: string;
  author: string;
  publicationYear: number | null;
  price: unknown;
  condition: string | null;
  isAvailable: boolean;
  coverUrl: string | null;
  bookCategories: Array<{
    categoryId: number;
    category: {
      categoryId: number;
      name: string;
    };
  }>;
  inventories: Array<{ availableQuantity: number }>;
};

type RecommendationSignals = {
  categoryWeights: Map<number, number>;
  authorWeights: Map<string, number>;
  keywordWeights: Map<string, number>;
  purchasedBookIds: Set<number>;
  hasAnySignal: boolean;
};

type ScoredCandidate = {
  book: CandidateBook;
  score: number;
  reasons: string[];
  matchedSignal: boolean;
};

const DEFAULT_LIMIT = 10;
const CANDIDATE_LIMIT = 200;
const HISTORY_LIMIT = 20;

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(clientId: number, limit = DEFAULT_LIMIT): Promise<RecommendationsResponseDto> {
    const safeLimit = this.normalizeLimit(limit);
    await this.assertClientExists(clientId);
    const signals = await this.buildHistorySignals(clientId);

    if (!signals.hasAnySignal) {
      return this.getFallbackRecommendations(safeLimit, 'popular');
    }

    const scored = await this.scoreAvailableBooks(signals, {
      limit: safeLimit,
      excludeOwned: true,
      purchasedBookIds: signals.purchasedBookIds,
    });

    if (scored.length === 0) {
      return this.getFallbackRecommendations(safeLimit, 'popular');
    }

    return this.buildResponse('history', scored.slice(0, safeLimit));
  }

  async getBotRecommendations(
    clientId: number,
    dto: RecommendationBotRequestDto,
  ): Promise<RecommendationsResponseDto> {
    await this.assertClientExists(clientId);
    const signals = await this.buildHistorySignals(clientId);
    const requestedLimit = this.normalizeLimit(dto.limit ?? DEFAULT_LIMIT);

    const preferredCategoryIds = new Set(dto.preferredCategoryIds ?? []);
    const preferredAuthors = (dto.preferredAuthors ?? [])
      .map((author) => this.normalizeText(author))
      .filter(Boolean);
    const keywordTokens = this.tokenize(dto.keywords);

    const mergedSignals: RecommendationSignals = {
      categoryWeights: this.mergeWeights(
        signals.categoryWeights,
        this.weightsFromIds(preferredCategoryIds, 7),
      ),
      authorWeights: this.mergeWeights(
        signals.authorWeights,
        this.weightsFromStrings(preferredAuthors, 6),
      ),
      keywordWeights: this.mergeWeights(
        signals.keywordWeights,
        this.weightsFromStrings(keywordTokens, 4),
      ),
      purchasedBookIds: signals.purchasedBookIds,
      hasAnySignal:
        signals.hasAnySignal ||
        preferredCategoryIds.size > 0 ||
        preferredAuthors.length > 0 ||
        keywordTokens.length > 0 ||
        Boolean(dto.language) ||
        dto.minPrice !== undefined ||
        dto.maxPrice !== undefined,
    };

    const scored = await this.scoreAvailableBooks(mergedSignals, {
      limit: requestedLimit,
      excludeOwned: dto.excludeOwned !== false,
      purchasedBookIds: signals.purchasedBookIds,
      language: dto.language,
      minPrice: dto.minPrice,
      maxPrice: dto.maxPrice,
    });

    if (scored.length === 0) {
      return this.getFallbackRecommendations(requestedLimit, 'bot');
    }

    return this.buildResponse('bot', scored.slice(0, requestedLimit));
  }

  async recordSearchHistory(clientId: number, query: GetBooksQueryDto): Promise<void> {
    const signature = this.buildSearchSignature(query);

    if (!signature) {
      return;
    }

    await this.prisma.searchHistory.create({
      data: {
        clientId,
        query: signature,
        categoryId: query.categoryId ?? null,
      },
    });
  }

  private async assertClientExists(clientId: number): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { clientId },
      select: { clientId: true },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
  }

  private async buildHistorySignals(clientId: number): Promise<RecommendationSignals> {
    const [purchases, searches] = await Promise.all([
      this.prisma.purchase.findMany({
        where: {
          clientId,
          status: {
            not: PurchaseStatus.cancelled,
          },
        },
        orderBy: { purchaseDate: 'desc' },
        take: HISTORY_LIMIT,
        select: {
          purchaseItems: {
            select: {
              bookId: true,
              quantity: true,
              book: {
                select: {
                  title: true,
                  author: true,
                  bookCategories: {
                    select: {
                      categoryId: true,
                      category: {
                        select: {
                          categoryId: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.searchHistory.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_LIMIT,
      }),
    ]);

    const categoryWeights = new Map<number, number>();
    const authorWeights = new Map<string, number>();
    const keywordWeights = new Map<string, number>();
    const purchasedBookIds = new Set<number>();

    for (const purchase of purchases) {
      for (const item of purchase.purchaseItems) {
        purchasedBookIds.add(item.bookId);
        this.incrementWeight(authorWeights, this.normalizeText(item.book.author), item.quantity * 3);
        this.addKeywords(keywordWeights, `${item.book.title} ${item.book.author}`, item.quantity * 2);

        for (const bookCategory of item.book.bookCategories) {
          this.incrementWeight(categoryWeights, bookCategory.categoryId, item.quantity * 6);
        }
      }
    }

    for (const search of searches) {
      if (search.categoryId) {
        this.incrementWeight(categoryWeights, search.categoryId, 3);
      }

      const recentQuery = this.normalizeText(search.query);
      if (!recentQuery) {
        continue;
      }

      this.addKeywords(keywordWeights, recentQuery, 2);

      const matchedBooks = await this.prisma.book.findMany({
        where: {
          isAvailable: true,
          OR: [
            {
              title: { contains: recentQuery, mode: 'insensitive' },
            },
            {
              author: { contains: recentQuery, mode: 'insensitive' },
            },
          ],
        },
        take: 8,
        select: {
          author: true,
          bookCategories: {
            select: {
              categoryId: true,
            },
          },
        },
      });

      for (const book of matchedBooks) {
        this.incrementWeight(authorWeights, this.normalizeText(book.author), 1.5);
        for (const bookCategory of book.bookCategories) {
          this.incrementWeight(categoryWeights, bookCategory.categoryId, 2);
        }
      }
    }

    return {
      categoryWeights,
      authorWeights,
      keywordWeights,
      purchasedBookIds,
      hasAnySignal:
        categoryWeights.size > 0 ||
        authorWeights.size > 0 ||
        keywordWeights.size > 0 ||
        purchasedBookIds.size > 0,
    };
  }

  private async scoreAvailableBooks(
    signals: RecommendationSignals,
    options: {
      limit: number;
      excludeOwned: boolean;
      purchasedBookIds: Set<number>;
      language?: string;
      minPrice?: number;
      maxPrice?: number;
    },
  ): Promise<ScoredCandidate[]> {
    if (
      options.minPrice !== undefined &&
      options.maxPrice !== undefined &&
      options.minPrice > options.maxPrice
    ) {
      throw new BadRequestException('minPrice no puede ser mayor que maxPrice');
    }

    const where: Prisma.BookWhereInput = {
      isAvailable: true,
      inventories: {
        some: {
          availableQuantity: {
            gt: 0,
          },
        },
      },
    };

    if (options.excludeOwned && options.purchasedBookIds.size > 0) {
      where.NOT = {
        bookId: {
          in: Array.from(options.purchasedBookIds),
        },
      };
    }

    if (options.language) {
      where.language = {
        equals: options.language.trim(),
        mode: 'insensitive',
      };
    }

    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      where.price = {
        ...(options.minPrice !== undefined ? { gte: options.minPrice } : {}),
        ...(options.maxPrice !== undefined ? { lte: options.maxPrice } : {}),
      };
    }

    const books = await this.prisma.book.findMany({
      where,
      take: CANDIDATE_LIMIT,
      orderBy: [{ publicationYear: 'desc' }, { bookId: 'asc' }],
      select: {
        bookId: true,
        title: true,
        author: true,
        publicationYear: true,
        price: true,
        condition: true,
        isAvailable: true,
        coverUrl: true,
        bookCategories: {
          select: {
            categoryId: true,
            category: {
              select: {
                categoryId: true,
                name: true,
              },
            },
          },
        },
        inventories: {
          select: {
            availableQuantity: true,
          },
        },
      },
    });

    const currentYear = new Date().getFullYear();

    return books
      .map<ScoredCandidate>((book) => {
        let score = 0;
        const reasons: string[] = [];
        let matchedSignal = false;

        for (const bookCategory of book.bookCategories) {
          const categoryScore = signals.categoryWeights.get(bookCategory.categoryId) ?? 0;
          if (categoryScore > 0) {
            score += categoryScore;
            reasons.push(`Coincide con la categoría ${bookCategory.category.name}`);
            matchedSignal = true;
          }
        }

        const normalizedAuthor = this.normalizeText(book.author);
        const authorScore = signals.authorWeights.get(normalizedAuthor) ?? 0;
        if (authorScore > 0) {
          score += authorScore;
          reasons.push(`Coincide con el autor ${book.author}`);
          matchedSignal = true;
        }

        const normalizedTitle = this.normalizeText(book.title);
        for (const [keyword, keywordScore] of signals.keywordWeights.entries()) {
          if (keyword && (normalizedTitle.includes(keyword) || normalizedAuthor.includes(keyword))) {
            score += keywordScore;
            reasons.push('Relacionado con tus búsquedas recientes');
            matchedSignal = true;
            break;
          }
        }

        if (book.publicationYear) {
          const recencyBonus = Math.max(0, 6 - Math.min(6, currentYear - book.publicationYear));
          score += recencyBonus * 0.5;
        }

        const inventoryQuantity = book.inventories.reduce(
          (total, inventory) => total + inventory.availableQuantity,
          0,
        );
        score += Math.min(2, inventoryQuantity / 10);

        if (reasons.length === 0) {
          reasons.push('Coincide con el catálogo disponible y tu perfil general');
        }

        return {
          book,
          score,
          reasons: Array.from(new Set(reasons)),
          matchedSignal,
        };
      })
      .filter((entry) => entry.matchedSignal)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (right.book.publicationYear !== left.book.publicationYear) {
          return (right.book.publicationYear ?? 0) - (left.book.publicationYear ?? 0);
        }

        return left.book.bookId - right.book.bookId;
      })
      .slice(0, options.limit);
  }

  private async getFallbackRecommendations(
    limit: number,
    strategy: 'popular' | 'bot',
  ): Promise<RecommendationsResponseDto> {
    const purchases = await this.prisma.purchase.findMany({
      where: {
        status: {
          not: PurchaseStatus.cancelled,
        },
      },
      select: {
        purchaseItems: {
          select: {
            bookId: true,
            quantity: true,
          },
        },
      },
    });

    const popularity = new Map<number, number>();
    for (const purchase of purchases) {
      for (const item of purchase.purchaseItems) {
        this.incrementWeight(popularity, item.bookId, item.quantity);
      }
    }

    const books = await this.prisma.book.findMany({
      where: {
        isAvailable: true,
        inventories: {
          some: {
            availableQuantity: {
              gt: 0,
            },
          },
        },
      },
      take: CANDIDATE_LIMIT,
      orderBy: [{ publicationYear: 'desc' }, { bookId: 'asc' }],
      select: {
        bookId: true,
        title: true,
        author: true,
        publicationYear: true,
        price: true,
        condition: true,
        isAvailable: true,
        coverUrl: true,
        bookCategories: {
          select: {
            categoryId: true,
            category: {
              select: {
                categoryId: true,
                name: true,
              },
            },
          },
        },
        inventories: {
          select: {
            availableQuantity: true,
          },
        },
      },
    });

    const scored = books
      .map<ScoredCandidate>((book) => {
        const inventoryQuantity = book.inventories.reduce(
          (total, inventory) => total + inventory.availableQuantity,
          0,
        );
        const popularityScore = Math.log10((popularity.get(book.bookId) ?? 0) + 1) * 4;
        const recencyScore = book.publicationYear
          ? Math.max(0, 5 - Math.min(5, new Date().getFullYear() - book.publicationYear)) * 0.4
          : 0;

        return {
          book,
          score: popularityScore + recencyScore + Math.min(2, inventoryQuantity / 10),
          reasons:
            strategy === 'popular'
              ? ['Más vendido entre los clientes', 'Buen ajuste por disponibilidad actual']
              : ['Sugerencia basada en popularidad general', 'Buen ajuste por disponibilidad actual'],
          matchedSignal: true,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.book.bookId - right.book.bookId;
      })
      .slice(0, limit);

    return this.buildResponse(strategy, scored);
  }

  private buildResponse(strategy: 'history' | 'popular' | 'bot', scored: ScoredCandidate[]): RecommendationsResponseDto {
    return {
      strategy,
      generatedAt: new Date(),
      items: scored.map((entry) => ({
        book: this.mapBook(entry.book),
        score: Number(entry.score.toFixed(2)),
        reasons: entry.reasons,
      })),
    };
  }

  private mapBook(book: CandidateBook): BookListItemDto {
    return {
      id: book.bookId,
      coverUrl: book.coverUrl,
      title: book.title,
      author: book.author,
      price: Number(book.price),
      quantity: book.inventories.reduce((total, inventory) => total + inventory.availableQuantity, 0),
      status: book.condition,
      isAvailable: book.isAvailable,
    };
  }

  private mergeWeights<T>(base: Map<T, number>, extra: Map<T, number>): Map<T, number> {
    const merged = new Map(base);

    for (const [key, weight] of extra.entries()) {
      this.incrementWeight(merged, key, weight);
    }

    return merged;
  }

  private weightsFromIds(ids: Set<number>, weight: number): Map<number, number> {
    const result = new Map<number, number>();

    for (const id of ids) {
      result.set(id, weight);
    }

    return result;
  }

  private weightsFromStrings(values: string[], weight: number): Map<string, number> {
    const result = new Map<string, number>();

    for (const value of values) {
      result.set(this.normalizeText(value), weight);
    }

    return result;
  }

  private addKeywords(target: Map<string, number>, text: string, weight: number): void {
    for (const token of this.tokenize(text)) {
      this.incrementWeight(target, token, weight);
    }
  }

  private incrementWeight<T>(target: Map<T, number>, key: T, weight: number): void {
    target.set(key, (target.get(key) ?? 0) + weight);
  }

  private buildSearchSignature(query: GetBooksQueryDto): string {
    const parts = [
      query.title?.trim(),
      query.author?.trim(),
      query.categoryId !== undefined ? `category:${query.categoryId}` : '',
      query.language?.trim() ? `language:${query.language.trim()}` : '',
      query.condition ? `condition:${query.condition}` : '',
      query.year !== undefined ? `year:${query.year}` : '',
      query.minPrice !== undefined ? `min:${query.minPrice}` : '',
      query.maxPrice !== undefined ? `max:${query.maxPrice}` : '',
    ].filter(Boolean);

    return parts.join(' ').slice(0, 255);
  }

  private normalizeLimit(value: number): number {
    if (!Number.isFinite(value)) {
      return DEFAULT_LIMIT;
    }

    return Math.max(1, Math.min(Math.trunc(value), 20));
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(value?: string): string[] {
    if (!value) {
      return [];
    }

    return this.normalizeText(value)
      .split(' ')
      .filter((token) => token.length >= 3);
  }
}