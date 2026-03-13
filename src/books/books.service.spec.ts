import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
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
  };
  let s3Service: {
    uploadCover: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      book: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    s3Service = {
      uploadCover: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: S3Service,
          useValue: s3Service,
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
      where: { isAvailable: true },
      skip: 2,
      take: 2,
      orderBy: { bookId: 'asc' },
      select: {
        bookId: true,
        coverUrl: true,
        title: true,
        author: true,
        price: true,
        condition: true,
        isAvailable: true,
      },
    });
    expect(prismaService.book.count).toHaveBeenCalledWith({
      where: { isAvailable: true },
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
    });
  });

  it('throws not found when requesting a missing book detail', async () => {
    prismaService.book.findUnique.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('stores uploaded cover URL and returns the mapped response', async () => {
    prismaService.book.findUnique.mockResolvedValue({ bookId: 15 });
    s3Service.uploadCover.mockResolvedValue({
      url: 'https://bucket.s3.us-east-1.amazonaws.com/books/15/covers/test.webp',
    });
    prismaService.book.update.mockResolvedValue({
      bookId: 15,
      coverUrl: 'https://bucket.s3.us-east-1.amazonaws.com/books/15/covers/test.webp',
    });

    const result = await service.uploadCover(15, {
      buffer: Buffer.from('image'),
      originalname: 'cover.webp',
      mimetype: 'image/webp',
      size: 5,
    });

    expect(s3Service.uploadCover).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'cover.webp' }),
      15,
    );
    expect(prismaService.book.update).toHaveBeenCalledWith({
      where: { bookId: 15 },
      data: {
        coverUrl: 'https://bucket.s3.us-east-1.amazonaws.com/books/15/covers/test.webp',
      },
      select: {
        bookId: true,
        coverUrl: true,
      },
    });
    expect(result).toEqual({
      id: 15,
      coverUrl: 'https://bucket.s3.us-east-1.amazonaws.com/books/15/covers/test.webp',
    });
  });

  it('throws not found when uploading cover for a missing book', async () => {
    prismaService.book.findUnique.mockResolvedValue(null);

    await expect(
      service.uploadCover(404, {
        buffer: Buffer.from('image'),
        originalname: 'cover.webp',
        mimetype: 'image/webp',
        size: 5,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});