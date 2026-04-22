import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { BookDetailDto } from './dto/book-detail.dto';
import { BookListItemDto } from './dto/book-list-item.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { GetBooksQueryDto } from './dto/get-books-query.dto';
import { PaginatedBooksResponseDto } from './dto/paginated-books-response.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UploadBookCoverResponseDto } from './dto/upload-book-cover-response.dto';
import { S3Service } from '../storage/s3.service';
import { UploadedFile } from '../storage/interfaces/uploaded-file.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(query: GetBooksQueryDto): Promise<PaginatedBooksResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const where = this.buildSearchWhere(query);
    const orderBy = this.buildOrderBy(query);

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          bookId: true,
          coverUrl: true,
          title: true,
          author: true,
          price: true,
          condition: true,
          isAvailable: true,
          inventories: {
            select: {
              availableQuantity: true,
            },
          },
        },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      items: books.map<BookListItemDto>((book) => ({
        id: book.bookId,
        coverUrl: book.coverUrl,
        title: book.title,
        author: book.author,
        price: Number(book.price),
        status: book.condition,
        isAvailable: book.isAvailable,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private buildSearchWhere(query: GetBooksQueryDto): Prisma.BookWhereInput {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
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

    if (query.title) {
      where.title = {
        contains: query.title.trim(),
        mode: 'insensitive',
      };
    }

    if (query.author) {
      where.author = {
        contains: query.author.trim(),
        mode: 'insensitive',
      };
    }

    if (query.categoryId) {
      where.bookCategories = {
        some: {
          categoryId: query.categoryId,
        },
      };
    }

    if (query.language) {
      where.language = {
        equals: query.language.trim(),
        mode: 'insensitive',
      };
    }

    if (query.condition) {
      where.condition = query.condition;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        gte: query.minPrice,
        lte: query.maxPrice,
      };
    }

    if (query.year) {
      where.publicationYear = query.year;
    }

    return where;
  }

  private buildOrderBy(
    query: GetBooksQueryDto,
  ): Prisma.BookOrderByWithRelationInput[] {
    const sortOrder = query.sortOrder ?? 'desc';
    const sortBy = query.sortBy ?? 'relevance';

    if (sortBy === 'price') {
      return [{ price: sortOrder }, { bookId: 'asc' }];
    }

    if (sortBy === 'publicationYear') {
      return [{ publicationYear: sortOrder }, { bookId: 'asc' }];
    }

    // Relevance temporal: por defecto prioriza publicaciones recientes.
    return [{ publicationYear: sortOrder }, { bookId: 'asc' }];
  }

  async findOne(id: number): Promise<BookDetailDto> {
    const book = await this.prisma.book.findUnique({
      where: { bookId: id },
      include: {
        inventories: {
          include: {
            store: {
              select: {
                storeId: true,
                name: true,
                city: true,
              },
            },
          },
          orderBy: {
            storeId: 'asc',
          },
        },
        bookImages: {
          orderBy: { displayOrder: 'asc' },
        },
        bookCategories: {
          include: {
            category: true,
          },
          orderBy: {
            categoryId: 'asc',
          },
        },
      },
    });

    if (!book) {
      throw new NotFoundException('Libro no encontrado');
    }

    return {
      id: book.bookId,
      title: book.title,
      author: book.author,
      publicationYear: book.publicationYear,
      publisher: book.publisher,
      isbn: book.isbn,
      language: book.language,
      pageCount: book.pageCount,
      price: Number(book.price),
      quantity: (book.inventories ?? []).reduce(
        (totalQuantity, inventory) =>
          totalQuantity + inventory.availableQuantity,
        0,
      ),
      status: book.condition,
      isAvailable: book.isAvailable,
      description: book.description,
      coverUrl: book.coverUrl,
      preview: book.previewUrl,
      images: book.bookImages.map((image) => ({
        id: image.imageId,
        url: image.imageUrl,
        displayOrder: image.displayOrder,
      })),
      categories: book.bookCategories.map((bookCategory) => ({
        id: bookCategory.category.categoryId,
        name: bookCategory.category.name,
        description: bookCategory.category.description,
      })),
      inventoriesByStore: book.inventories.map((inventory) => ({
        storeId: inventory.store.storeId,
        storeName: inventory.store.name,
        city: inventory.store.city,
        availableQuantity: inventory.availableQuantity,
      })),
    };
  }

  async uploadCover(
    id: number,
    file: UploadedFile,
  ): Promise<UploadBookCoverResponseDto> {
    const book = await this.prisma.book.findUnique({
      where: { bookId: id },
      select: { bookId: true },
    });

    if (!book) {
      throw new NotFoundException('Libro no encontrado');
    }

    const { url } = await this.s3Service.uploadCover(file, id);

    const updatedBook = await this.prisma.book.update({
      where: { bookId: id },
      data: {
        coverUrl: url,
      },
      select: {
        bookId: true,
        coverUrl: true,
      },
    });

    return {
      id: updatedBook.bookId,
      coverUrl: updatedBook.coverUrl ?? url,
    };
  }

  async adminCreate(dto: CreateBookDto) {
    let created: { bookId: number };
    try {
      created = await this.prisma.book.create({
        data: {
          title: dto.title,
          author: dto.author,
          publicationYear: dto.publicationYear ?? null,
          publisher: dto.publisher ?? null,
          isbn: dto.isbn ?? null,
          language: dto.language ?? null,
          pageCount: dto.pageCount ?? null,
          price: dto.price,
          condition: dto.condition ?? null,
          isAvailable: dto.isAvailable ?? true,
          description: dto.description ?? null,
          coverUrl: dto.coverUrl ?? null,
          previewUrl: dto.previewUrl ?? null,
        },
        select: {
          bookId: true,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('El ISBN ya está registrado');
      }
      throw error;
    }

    // Create book-category relations
    if (dto.categoryIds && dto.categoryIds.length > 0) {
      // Verify all categories exist
      const categories = await this.prisma.category.findMany({
        where: { categoryId: { in: dto.categoryIds } },
        select: { categoryId: true },
      });
      if (categories.length !== dto.categoryIds.length) {
        throw new NotFoundException('Una o más categorías no existen');
      }

      // Create relations
      await this.prisma.bookCategory.createMany({
        data: dto.categoryIds.map((categoryId) => ({
          bookId: created.bookId,
          categoryId,
        })),
      });
    }

    // Create initial inventory if quantity provided
    if (dto.initialInventoryQuantity && dto.initialInventoryQuantity > 0) {
      // Get first active store
      const firstStore = await this.prisma.store.findFirst({
        where: { status: 'active' },
        select: { storeId: true },
      });

      if (firstStore) {
        await this.prisma.inventory.create({
          data: {
            bookId: created.bookId,
            storeId: firstStore.storeId,
            availableQuantity: dto.initialInventoryQuantity,
            reservedQuantity: 0,
          },
        });
      }
    }

    // Trigger notifications for subscribed users
    this.triggerNewBookNotifications(created.bookId).catch((error) => {
      // Log error but don't fail book creation
      console.error('Error sending new book notifications:', error);
    });

    return { id: created.bookId };
  }

  private async triggerNewBookNotifications(bookId: number): Promise<void> {
    // Get book with categories
    const book = await this.prisma.book.findUnique({
      where: { bookId },
      include: { bookCategories: { include: { category: true } } },
    });
    if (!book || book.bookCategories.length === 0) {
      return; // No categories, no notifications
    }

    // Get unique category IDs
    const categoryIds = [
      ...new Set(book.bookCategories.map((bc) => bc.categoryId)),
    ];

    // Create news for the new book
    const news = await this.prisma.news.create({
      data: {
        bookId,
        title: `Nuevo libro disponible: ${book.title}`,
        content: `Se ha añadido un nuevo libro "${book.title}" de ${book.author} a nuestro catálogo.`,
        isAutoGenerated: true,
        isActive: true,
      },
    });

    // Create news categories
    await this.prisma.newsCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        newsId: news.newsId,
        categoryId,
      })),
    });

    // Find all subscriptions to these categories
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        categoryId: { in: categoryIds },
      },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
    });

    // Get unique user IDs
    const userIds = [...new Set(subscriptions.map((sub) => sub.client.userId))];

    // Send notifications
    for (const userId of userIds) {
      await this.notificationsService.sendNewBookNotification(
        userId,
        news.newsId,
      );
    }
  }

  async adminUpdate(id: number, dto: UpdateBookDto) {
    await this.assertBookExists(id);

    let updated: { bookId: number };
    try {
      updated = await this.prisma.book.update({
        where: { bookId: id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.author !== undefined ? { author: dto.author } : {}),
          ...(dto.publicationYear !== undefined
            ? { publicationYear: dto.publicationYear }
            : {}),
          ...(dto.publisher !== undefined ? { publisher: dto.publisher } : {}),
          ...(dto.isbn !== undefined ? { isbn: dto.isbn } : {}),
          ...(dto.language !== undefined ? { language: dto.language } : {}),
          ...(dto.pageCount !== undefined ? { pageCount: dto.pageCount } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
          ...(dto.isAvailable !== undefined
            ? { isAvailable: dto.isAvailable }
            : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.coverUrl !== undefined ? { coverUrl: dto.coverUrl } : {}),
          ...(dto.previewUrl !== undefined
            ? { previewUrl: dto.previewUrl }
            : {}),
        },
        select: {
          bookId: true,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('El ISBN ya está registrado');
      }
      throw error;
    }

    // Update book-category relations if categoryIds provided
    if (dto.categoryIds !== undefined) {
      // Delete existing relations
      await this.prisma.bookCategory.deleteMany({
        where: { bookId: id },
      });

      // Create new relations if any
      if (dto.categoryIds.length > 0) {
        // Verify all categories exist
        const categories = await this.prisma.category.findMany({
          where: { categoryId: { in: dto.categoryIds } },
          select: { categoryId: true },
        });
        if (categories.length !== dto.categoryIds.length) {
          throw new NotFoundException('Una o más categorías no existen');
        }

        // Create relations
        await this.prisma.bookCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({
            bookId: id,
            categoryId,
          })),
        });
      }
    }

    return { id: updated.bookId };
  }

  async adminDelete(id: number) {
    await this.assertBookExists(id);
    await this.prisma.book.delete({
      where: { bookId: id },
      select: { bookId: true },
    });
    return { id };
  }

  private async assertBookExists(id: number) {
    const existing = await this.prisma.book.findUnique({
      where: { bookId: id },
      select: { bookId: true },
    });
    if (!existing) {
      throw new NotFoundException('Libro no encontrado');
    }
  }
}
