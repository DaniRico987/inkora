import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BooksService } from './books.service';

describe('BooksService', () => {
  let service: BooksService;
  let prismaService: {
    book: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    book3DModel: {
      findUnique: jest.Mock;
    };
  };
  let notificationsService: {
    sendNewBookNotification: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      book: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      book3DModel: {
        findUnique: jest.fn(),
      },
    };

    notificationsService = {
      sendNewBookNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  it('maps paginated available books and applies pagination filters', async () => {
    prismaService.book.findMany.mockResolvedValue([
      {
        bookId: 10,
        coverUrl: 'https://cdn.inkora.com/books/10-cover.webp',
        title: 'El principito',
        author: 'Antoine de Saint-Exupery',
        price: '19900',
        condition: 'used',
        isAvailable: true,
      },
      {
        bookId: 11,
        coverUrl: null,
        title: 'Pedro Paramo',
        author: 'Juan Rulfo',
        price: '25500.5',
        condition: 'new',
        isAvailable: true,
      },
    ]);
    prismaService.book.count.mockResolvedValue(7);

    const result = await service.findAll({ page: 2, limit: 2 });

    expect(prismaService.book.findMany).toHaveBeenCalledWith({
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
      skip: 2,
      take: 2,
      orderBy: [{ publicationYear: 'desc' }, { bookId: 'asc' }],
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
    });
    expect(prismaService.book.count).toHaveBeenCalledWith({
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
    });
    expect(result).toEqual({
      items: [
        {
          id: 10,
          coverUrl: 'https://cdn.inkora.com/books/10-cover.webp',
          title: 'El principito',
          author: 'Antoine de Saint-Exupery',
          price: 19900,
          status: 'used',
          isAvailable: true,
        },
        {
          id: 11,
          coverUrl: null,
          title: 'Pedro Paramo',
          author: 'Juan Rulfo',
          price: 25500.5,
          status: 'new',
          isAvailable: true,
        },
      ],
      page: 2,
      limit: 2,
      total: 7,
      totalPages: 4,
    });
  });

  it('builds dynamic where filters and sort order for search queries', async () => {
    prismaService.book.findMany.mockResolvedValue([]);
    prismaService.book.count.mockResolvedValue(0);

    await service.findAll({
      title: 'Macondo',
      author: 'Garcia',
      categoryId: 5,
      language: 'Espanol',
      condition: 'used',
      minPrice: 10000,
      maxPrice: 45000,
      year: 1967,
      sortBy: 'price',
      sortOrder: 'asc',
      page: 1,
      limit: 12,
    });

    expect(prismaService.book.findMany).toHaveBeenCalledWith({
      where: {
        isAvailable: true,
        inventories: {
          some: {
            availableQuantity: {
              gt: 0,
            },
          },
        },
        title: {
          contains: 'Macondo',
          mode: 'insensitive',
        },
        author: {
          contains: 'Garcia',
          mode: 'insensitive',
        },
        bookCategories: {
          some: {
            categoryId: 5,
          },
        },
        language: {
          equals: 'Espanol',
          mode: 'insensitive',
        },
        condition: 'used',
        price: {
          gte: 10000,
          lte: 45000,
        },
        publicationYear: 1967,
      },
      skip: 0,
      take: 12,
      orderBy: [{ price: 'asc' }, { bookId: 'asc' }],
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
    });
    expect(prismaService.book.count).toHaveBeenCalledWith({
      where: {
        isAvailable: true,
        inventories: {
          some: {
            availableQuantity: {
              gt: 0,
            },
          },
        },
        title: {
          contains: 'Macondo',
          mode: 'insensitive',
        },
        author: {
          contains: 'Garcia',
          mode: 'insensitive',
        },
        bookCategories: {
          some: {
            categoryId: 5,
          },
        },
        language: {
          equals: 'Espanol',
          mode: 'insensitive',
        },
        condition: 'used',
        price: {
          gte: 10000,
          lte: 45000,
        },
        publicationYear: 1967,
      },
    });
  });

  it('throws bad request when minPrice is greater than maxPrice', async () => {
    await expect(
      service.findAll({
        minPrice: 50000,
        maxPrice: 10000,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaService.book.findMany).not.toHaveBeenCalled();
    expect(prismaService.book.count).not.toHaveBeenCalled();
  });

  it('maps book detail including images and categories', async () => {
    prismaService.book.findUnique.mockResolvedValue({
      bookId: 12,
      title: 'Cien anos de soledad',
      author: 'Gabriel Garcia Marquez',
      publicationYear: 1967,
      publisher: 'Sudamericana',
      isbn: '9780307474728',
      language: 'Espanol',
      pageCount: 432,
      price: '49900',
      condition: 'used',
      isAvailable: true,
      description: 'Saga familiar en Macondo.',
      coverUrl: 'https://cdn.inkora.com/books/12-cover.webp',
      previewUrl: 'https://cdn.inkora.com/books/12-preview.pdf',
      bookImages: [
        {
          imageId: 2,
          imageUrl: 'https://cdn.inkora.com/books/12-gallery-2.webp',
          displayOrder: 2,
        },
      ],
      bookCategories: [
        {
          category: {
            categoryId: 5,
            name: 'Novela',
            description: 'Obras narrativas de ficcion de extension amplia.',
          },
        },
      ],
      inventories: [
        {
          store: {
            storeId: 1,
            name: 'Tienda Central',
            city: 'Bogota',
          },
          availableQuantity: 5,
        },
      ],
    });

    const result = await service.findOne(12);

    expect(prismaService.book.findUnique).toHaveBeenCalledWith({
      where: { bookId: 12 },
      include: {
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
      },
    });
    expect(result).toEqual({
      id: 12,
      title: 'Cien anos de soledad',
      author: 'Gabriel Garcia Marquez',
      publicationYear: 1967,
      publisher: 'Sudamericana',
      isbn: '9780307474728',
      language: 'Espanol',
      pageCount: 432,
      price: 49900,
      status: 'used',
      isAvailable: true,
      description: 'Saga familiar en Macondo.',
      coverUrl: 'https://cdn.inkora.com/books/12-cover.webp',
      preview: 'https://cdn.inkora.com/books/12-preview.pdf',
      images: [
        {
          id: 2,
          url: 'https://cdn.inkora.com/books/12-gallery-2.webp',
          displayOrder: 2,
        },
      ],
      categories: [
        {
          id: 5,
          name: 'Novela',
          description: 'Obras narrativas de ficcion de extension amplia.',
        },
      ],
      quantity: 5,
      inventoriesByStore: [
        {
          storeId: 1,
          storeName: 'Tienda Central',
          city: 'Bogota',
          availableQuantity: 5,
        },
      ],
    });
  });

  it('throws not found when requesting a missing book detail', async () => {
    prismaService.book.findUnique.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('stores uploaded cover and returns the mapped response', async () => {
    prismaService.book.findUnique.mockResolvedValue({ bookId: 15 });
    prismaService.book.update.mockResolvedValue({
      bookId: 15,
      coverUrl: 'data:image/webp;base64,aW1hZ2U=',
    });

    const file: Express.Multer.File = {
      buffer: Buffer.from('image'),
      originalname: 'cover.webp',
      mimetype: 'image/webp',
      size: 5,
      fieldname: 'file',
      encoding: '7bit',
      destination: '',
      filename: 'cover.webp',
      path: '',
      stream: null,
    };

    const result = await service.uploadCover(15, file);

    expect(prismaService.book.update).toHaveBeenCalledWith({
      where: { bookId: 15 },
      data: {
        coverUrl: 'data:image/webp;base64,aW1hZ2U=',
      },
      select: {
        bookId: true,
        coverUrl: true,
      },
    });
    expect(result).toEqual({
      id: 15,
      coverUrl: 'data:image/webp;base64,aW1hZ2U=',
    });
  });

  it('throws not found when uploading cover for a missing book', async () => {
    prismaService.book.findUnique.mockResolvedValue(null);
    const file: Express.Multer.File = {
      buffer: Buffer.from('image'),
      originalname: 'cover.webp',
      mimetype: 'image/webp',
      size: 5,
      fieldname: 'file',
      encoding: '7bit',
      destination: '',
      filename: 'cover.webp',
      path: '',
      stream: null,
    };

    await expect(service.uploadCover(404, file)).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('getBookModel', () => {
    it('returns the 3D model when book exists and has a model associated', async () => {
      prismaService.book.findUnique.mockResolvedValue({ bookId: 12 });
      prismaService.book3DModel.findUnique.mockResolvedValue({
        id: 1,
        bookId: 12,
        modelGlb: 'data:model/gltf-binary;base64,AAA...',
        fileName: 'model.glb',
      });

      const result = await service.getBookModel(12);

      expect(prismaService.book.findUnique).toHaveBeenCalledWith({
        where: { bookId: 12 },
        select: { bookId: true },
      });
      expect(prismaService.book3DModel.findUnique).toHaveBeenCalledWith({
        where: { bookId: 12 },
      });
      expect(result).toEqual({
        id: 1,
        bookId: 12,
        modelGlb: 'data:model/gltf-binary;base64,AAA...',
        fileName: 'model.glb',
      });
    });

    it('throws NotFoundException when the book does not exist', async () => {
      prismaService.book.findUnique.mockResolvedValue(null);

      await expect(service.getBookModel(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the book exists but does not have a 3D model', async () => {
      prismaService.book.findUnique.mockResolvedValue({ bookId: 12 });
      prismaService.book3DModel.findUnique.mockResolvedValue(null);

      await expect(service.getBookModel(12)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
