import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let prismaService: {
    client: {
      findUnique: jest.Mock;
    };
    purchase: {
      findMany: jest.Mock;
    };
    searchHistory: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
    book: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      client: {
        findUnique: jest.fn(),
      },
      purchase: {
        findMany: jest.fn(),
      },
      searchHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      book: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it('returns popular fallback recommendations when the client has no history', async () => {
    prismaService.client.findUnique.mockResolvedValue({ clientId: 7 });
    prismaService.purchase.findMany.mockResolvedValue([]);
    prismaService.searchHistory.findMany.mockResolvedValue([]);
    prismaService.book.findMany.mockResolvedValue([
      {
        bookId: 11,
        title: 'Cien anos de soledad',
        author: 'Gabriel Garcia Marquez',
        publicationYear: 1967,
        price: '49900',
        condition: 'used',
        isAvailable: true,
        coverUrl: 'https://cdn.inkora.com/books/11-cover.webp',
        bookCategories: [],
        inventories: [{ availableQuantity: 8 }],
      },
    ]);

    const result = await service.getRecommendations(7);

    expect(result.strategy).toBe('popular');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].book.id).toBe(11);
    expect(prismaService.book.findMany).toHaveBeenCalled();
  });

  it('returns bot recommendations using declared category preferences', async () => {
    prismaService.client.findUnique.mockResolvedValue({ clientId: 7 });
    prismaService.purchase.findMany.mockResolvedValue([]);
    prismaService.searchHistory.findMany.mockResolvedValue([]);
    prismaService.book.findMany.mockResolvedValue([
      {
        bookId: 21,
        title: 'El amor en los tiempos del colera',
        author: 'Gabriel Garcia Marquez',
        publicationYear: 1985,
        price: '55900',
        condition: 'new',
        isAvailable: true,
        coverUrl: null,
        bookCategories: [
          {
            categoryId: 5,
            category: {
              categoryId: 5,
              name: 'Realismo mágico',
            },
          },
        ],
        inventories: [{ availableQuantity: 3 }],
      },
      {
        bookId: 22,
        title: 'Manual de cocina',
        author: 'Autor diverso',
        publicationYear: 2019,
        price: '25000',
        condition: 'new',
        isAvailable: true,
        coverUrl: null,
        bookCategories: [
          {
            categoryId: 9,
            category: {
              categoryId: 9,
              name: 'Cocina',
            },
          },
        ],
        inventories: [{ availableQuantity: 6 }],
      },
    ]);

    const result = await service.getBotRecommendations(7, {
      preferredCategoryIds: [5],
      preferredAuthors: ['Gabriel Garcia Marquez'],
      keywords: 'realismo mágico',
      limit: 5,
    });

    expect(result.strategy).toBe('bot');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].book.id).toBe(21);
    expect(result.items[0].reasons.length).toBeGreaterThan(0);
  });

  it('persists search history signatures for tracked queries', async () => {
    prismaService.searchHistory.create.mockResolvedValue({});

    await service.recordSearchHistory(7, {
      title: 'Cien anos',
      author: 'Garcia Marquez',
      categoryId: 5,
      language: 'Espanol',
      condition: 'used',
      year: 1967,
      minPrice: 10000,
      maxPrice: 50000,
      page: 1,
      limit: 10,
      sortBy: 'relevance',
      sortOrder: 'desc',
    });

    expect(prismaService.searchHistory.create).toHaveBeenCalledWith({
      data: {
        clientId: 7,
        query:
          'Cien anos Garcia Marquez category:5 language:Espanol condition:used year:1967 min:10000 max:50000',
        categoryId: 5,
      },
    });
  });
});