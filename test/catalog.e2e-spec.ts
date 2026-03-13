import {
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { join } from 'path';
import { BooksModule } from '../src/books/books.module';
import { CategoriesModule } from '../src/categories/categories.module';
import { PrismaService } from '../prisma/prisma/prisma.service';
import { S3Service } from '../src/storage/s3.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

describe('Catalog (e2e)', () => {
  let app: INestApplication<App>;
  let prismaMock: {
    book: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    category: {
      findMany: jest.Mock;
    };
  };
  let s3Mock: {
    uploadCover: jest.Mock;
  };
  let jwtGuardSpy: jest.SpyInstance;
  let rolesGuardSpy: jest.SpyInstance;

  const books = [
    {
      bookId: 1,
      title: 'Disponible Uno',
      author: 'Autor Uno',
      publicationYear: 2020,
      publisher: 'Editorial Uno',
      isbn: '111',
      language: 'Espanol',
      pageCount: 120,
      price: '15000',
      condition: 'new',
      isAvailable: true,
      description: 'Libro disponible uno',
      coverUrl: 'https://cdn.inkora.com/books/1-cover.webp',
      previewUrl: 'https://cdn.inkora.com/books/1-preview.pdf',
      bookImages: [
        {
          imageId: 3,
          imageUrl: 'https://cdn.inkora.com/books/1-gallery-1.webp',
          displayOrder: 1,
        },
      ],
      bookCategories: [
        {
          categoryId: 1,
          category: {
            categoryId: 1,
            name: 'Novela',
            description: 'Narrativa extensa',
          },
        },
      ],
    },
    {
      bookId: 3,
      title: 'Disponible Dos',
      author: 'Autor Dos',
      publicationYear: 2023,
      publisher: 'Editorial Tres',
      isbn: '333',
      language: 'Ingles',
      pageCount: 340,
      price: '25000',
      condition: 'used',
      isAvailable: true,
      description: 'Libro disponible dos',
      coverUrl: 'https://cdn.inkora.com/books/3-cover.webp',
      previewUrl: null,
      bookImages: [],
      bookCategories: [
        {
          categoryId: 2,
          category: {
            categoryId: 2,
            name: 'Arte',
            description: 'Libros de arte',
          },
        },
      ],
    },
    {
      bookId: 4,
      title: 'Disponible Tres',
      author: 'Autor Uno',
      publicationYear: 2018,
      publisher: 'Editorial Cuatro',
      isbn: '444',
      language: 'Espanol',
      pageCount: 410,
      price: '10000',
      condition: 'new',
      isAvailable: true,
      description: 'Libro disponible tres',
      coverUrl: 'https://cdn.inkora.com/books/4-cover.webp',
      previewUrl: null,
      bookImages: [],
      bookCategories: [
        {
          categoryId: 1,
          category: {
            categoryId: 1,
            name: 'Novela',
            description: 'Narrativa extensa',
          },
        },
      ],
    },
    {
      bookId: 2,
      title: 'No Disponible',
      author: 'Autor Dos',
      publicationYear: 2019,
      publisher: 'Editorial Dos',
      isbn: '222',
      language: 'Espanol',
      pageCount: 220,
      price: '18000',
      condition: 'used',
      isAvailable: false,
      description: 'Libro no disponible',
      coverUrl: null,
      previewUrl: null,
      bookImages: [],
      bookCategories: [],
    },
  ];

  const categories = [
    { categoryId: 2, name: 'Arte' },
    { categoryId: 1, name: 'Novela' },
  ];
  const coverFixturePath = join(__dirname, 'fixtures', 'cover.webp');

  const matchesBookFilter = (book: (typeof books)[number], where?: any): boolean => {
    if (!where) {
      return true;
    }

    if (where.isAvailable !== undefined && book.isAvailable !== where.isAvailable) {
      return false;
    }

    if (
      where.title?.contains &&
      !book.title.toLowerCase().includes(String(where.title.contains).toLowerCase())
    ) {
      return false;
    }

    if (
      where.author?.contains &&
      !book.author.toLowerCase().includes(String(where.author.contains).toLowerCase())
    ) {
      return false;
    }

    if (
      where.language?.equals &&
      book.language?.toLowerCase() !== String(where.language.equals).toLowerCase()
    ) {
      return false;
    }

    if (where.condition && book.condition !== where.condition) {
      return false;
    }

    if (where.publicationYear !== undefined && book.publicationYear !== where.publicationYear) {
      return false;
    }

    const numericPrice = Number(book.price);
    if (where.price?.gte !== undefined && numericPrice < Number(where.price.gte)) {
      return false;
    }

    if (where.price?.lte !== undefined && numericPrice > Number(where.price.lte)) {
      return false;
    }

    if (where.bookCategories?.some?.categoryId !== undefined) {
      const categoryId = where.bookCategories.some.categoryId;
      const hasCategory = book.bookCategories.some(
        (bookCategory) => bookCategory.categoryId === categoryId,
      );

      if (!hasCategory) {
        return false;
      }
    }

    return true;
  };

  const applyOrdering = (
    inputBooks: (typeof books)[number][],
    orderBy?: Array<Record<string, 'asc' | 'desc'>> | Record<string, 'asc' | 'desc'>,
  ) => {
    const rules = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];

    return [...inputBooks].sort((left, right) => {
      for (const rule of rules) {
        const [field, direction] = Object.entries(rule)[0];
        const leftValue = left[field as keyof typeof left] as string | number | null | undefined;
        const rightValue = right[field as keyof typeof right] as string | number | null | undefined;

        if (leftValue === rightValue) {
          continue;
        }

        if (leftValue === null || leftValue === undefined) {
          return 1;
        }

        if (rightValue === null || rightValue === undefined) {
          return -1;
        }

        if (leftValue < rightValue) {
          return direction === 'asc' ? -1 : 1;
        }

        if (leftValue > rightValue) {
          return direction === 'asc' ? 1 : -1;
        }
      }

      return 0;
    });
  };

  beforeAll(async () => {
    jwtGuardSpy = jest
      .spyOn(JwtAuthGuard.prototype, 'canActivate')
      .mockImplementation((context) => {
        const request = context.switchToHttp().getRequest();
        const authorization = request.headers.authorization;

        if (!authorization) {
          throw new UnauthorizedException('Token inválido o ausente');
        }

        if (authorization === 'Bearer admin-token') {
          request.user = {
            userId: 1,
            email: 'admin@inkora.com',
            username: 'adminuser',
            firstName: 'Admin',
            lastName: 'User',
            userType: 'admin',
            status: 'active',
          };
          return true;
        }

        if (authorization === 'Bearer client-token') {
          request.user = {
            userId: 2,
            email: 'client@inkora.com',
            username: 'clientuser',
            firstName: 'Client',
            lastName: 'User',
            userType: 'client',
            status: 'active',
          };
          return true;
        }

        throw new UnauthorizedException('Token inválido o ausente');
      });

    rolesGuardSpy = jest
      .spyOn(RolesGuard.prototype, 'canActivate')
      .mockImplementation((context) => {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
          throw new UnauthorizedException('Usuario no autenticado');
        }

        if (user.userType === 'admin' || user.userType === 'root') {
          return true;
        }

        throw new ForbiddenException('No tienes permisos para esta acción');
      });

    prismaMock = {
      book: {
        findMany: jest.fn(({ where, skip = 0, take = 10, orderBy }) => {
          const filtered = books.filter((book) => matchesBookFilter(book, where));
          const ordered = applyOrdering(filtered, orderBy);

          return ordered.slice(skip, skip + take).map((book) => ({
            bookId: book.bookId,
            coverUrl: book.coverUrl,
            title: book.title,
            author: book.author,
            price: book.price,
            condition: book.condition,
            isAvailable: book.isAvailable,
          }));
        }),
        count: jest.fn(({ where }) => {
          return books.filter((book) => matchesBookFilter(book, where)).length;
        }),
        findUnique: jest.fn(({ where, select }) => {
          const book = books.find((item) => item.bookId === where.bookId) ?? null;

          if (!book) {
            return null;
          }

          if (select?.bookId) {
            return { bookId: book.bookId };
          }

          return book;
        }),
        update: jest.fn(({ where, data }) => {
          const book = books.find((item) => item.bookId === where.bookId);
          if (!book) {
            return null;
          }

          book.coverUrl = data.coverUrl;
          return {
            bookId: book.bookId,
            coverUrl: book.coverUrl,
          };
        }),
      },
      category: {
        findMany: jest.fn(() => {
          return [...categories].sort((left, right) =>
            left.name.localeCompare(right.name),
          );
        }),
      },
    };

    s3Mock = {
      uploadCover: jest.fn(async (_file, bookId: number) => ({
        url: `https://inkora-bucket.s3.us-east-1.amazonaws.com/books/${bookId}/covers/test-cover.webp`,
      })),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BooksModule, CategoriesModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(S3Service)
      .useValue(s3Mock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('INKORA API')
      .setVersion('1.0')
      .addTag('Books')
      .addTag('Categories')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        'JWT',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
  });

  afterAll(async () => {
    jwtGuardSpy.mockRestore();
    rolesGuardSpy.mockRestore();
    await app.close();
  });

  it('GET /books returns only available books', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/books')
      .expect(200);

    expect(response.body.items).toHaveLength(3);
    expect(
      response.body.items.every((item: { isAvailable: boolean }) => item.isAvailable),
    ).toBe(true);
    expect(response.body.total).toBe(3);
  });

  it('GET /books/search is public and supports combined filters', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/books/search?title=Disponible&author=Autor%20Uno&categoryId=1&language=Espanol&condition=new&minPrice=9000&maxPrice=16000&year=2020',
      )
      .expect(200);

    expect(response.body.items).toEqual([
      {
        id: 1,
        coverUrl: 'https://cdn.inkora.com/books/1-cover.webp',
        title: 'Disponible Uno',
        author: 'Autor Uno',
        price: 15000,
        status: 'new',
        isAvailable: true,
      },
    ]);
    expect(response.body.total).toBe(1);
  });

  it('GET /books/search enforces isAvailable and applies sorting and pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/books/search?sortBy=price&sortOrder=asc&page=1&limit=2')
      .expect(200);

    expect(response.body.items).toEqual([
      {
        id: 4,
        coverUrl: 'https://cdn.inkora.com/books/4-cover.webp',
        title: 'Disponible Tres',
        author: 'Autor Uno',
        price: 10000,
        status: 'new',
        isAvailable: true,
      },
      {
        id: 1,
        coverUrl: 'https://cdn.inkora.com/books/1-cover.webp',
        title: 'Disponible Uno',
        author: 'Autor Uno',
        price: 15000,
        status: 'new',
        isAvailable: true,
      },
    ]);
    expect(response.body.total).toBe(3);
    expect(response.body.totalPages).toBe(2);
    expect(
      response.body.items.every((item: { isAvailable: boolean }) => item.isAvailable),
    ).toBe(true);
  });

  it('GET /books/search validates invalid ranges and rejects minPrice > maxPrice', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/books/search?minPrice=50000&maxPrice=10000')
      .expect(400);
  });

  it('GET /books applies pagination validation errors', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/books?page=0&limit=10')
      .expect(400);
  });

  it('GET /books/:id includes images and categories', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/books/1')
      .expect(200);

    expect(response.body.images).toEqual([
      {
        id: 3,
        url: 'https://cdn.inkora.com/books/1-gallery-1.webp',
        displayOrder: 1,
      },
    ]);
    expect(response.body.categories).toEqual([
      {
        id: 1,
        name: 'Novela',
        description: 'Narrativa extensa',
      },
    ]);
  });

  it('GET /books/:id returns 404 for missing books', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/books/999')
      .expect(404);
  });

  it('GET /categories returns the mapped ordered categories', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);

    expect(response.body).toEqual([
      { id: 2, name: 'Arte' },
      { id: 1, name: 'Novela' },
    ]);
  });

  it('POST /books/:id/cover uploads cover and returns S3 URL', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/books/1/cover')
      .set('Authorization', 'Bearer admin-token')
      .attach('file', coverFixturePath)
      .expect(201);

    expect(s3Mock.uploadCover).toHaveBeenCalled();
    expect(response.body).toEqual({
      id: 1,
      coverUrl:
        'https://inkora-bucket.s3.us-east-1.amazonaws.com/books/1/covers/test-cover.webp',
    });
  });

  it('POST /books/:id/cover returns 401 without token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/books/1/cover')
      .attach('file', Buffer.from('fake-image-content'), {
        filename: 'cover.webp',
        contentType: 'image/webp',
      })
      .expect(401);
  });

  it('POST /books/:id/cover returns 403 for client role', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/books/1/cover')
      .set('Authorization', 'Bearer client-token')
      .attach('file', Buffer.from('fake-image-content'), {
        filename: 'cover.webp',
        contentType: 'image/webp',
      })
      .expect(403);
  });

  it('POST /books/:id/cover returns 400 for invalid file type', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/books/1/cover')
      .set('Authorization', 'Bearer admin-token')
      .attach('file', Buffer.from('not-an-image'), {
        filename: 'cover.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('POST /books/:id/cover returns 400 for files bigger than 5MB', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/books/1/cover')
      .set('Authorization', 'Bearer admin-token')
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'cover.webp',
        contentType: 'image/webp',
      })
      .expect(400);
  });

  it('POST /books/:id/cover returns 404 for a missing book', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/books/999/cover')
      .set('Authorization', 'Bearer admin-token')
      .attach('file', coverFixturePath)
      .expect(404);
  });

  it('serves generated swagger and exposes catalog endpoints', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    const paths = Object.keys(response.body.paths);

    expect(response.body.info.title).toBe('INKORA API');
    expect(paths).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/books'),
        expect.stringContaining('/books/{id}'),
        expect.stringContaining('/categories'),
      ]),
    );

    const coverUploadPath = paths.find(
      (path) => path.includes('/books') && path.includes('/cover'),
    );

    expect(coverUploadPath).toBeDefined();
    expect(response.body.paths[coverUploadPath as string]).toHaveProperty('post');
  });
});