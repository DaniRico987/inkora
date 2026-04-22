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
import { StoresModule } from '../src/stores/stores.module';
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
      create: jest.Mock;
      delete: jest.Mock;
      update: jest.Mock;
    };
    category: {
      findMany: jest.Mock;
    };
    store: {
      findMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
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
  const stores = [
    {
      storeId: 1,
      name: 'Inkora Centro',
      address: 'Av. Principal 1234',
      city: 'Santiago',
      latitude: null,
      longitude: null,
      capacity: 100,
      status: 'active',
    },
  ];

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

        if (authorization === 'Bearer root-token') {
          request.user = {
            userId: 3,
            email: 'root@inkora.com',
            username: 'rootuser',
            firstName: 'Root',
            lastName: 'User',
            userType: 'root',
            status: 'active',
          };
          return true;
        }

        throw new UnauthorizedException('Token inválido o ausente');
      });

    rolesGuardSpy = jest
      .spyOn(RolesGuard.prototype, 'canActivate')
      .mockImplementation(() => true);

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
        create: jest.fn(({ data }) => {
          const nextId =
            Math.max(0, ...books.map((item) => item.bookId)) + 1;
          const created = {
            bookId: nextId,
            title: data.title,
            author: data.author,
            publicationYear: data.publicationYear ?? null,
            publisher: data.publisher ?? null,
            isbn: data.isbn ?? null,
            language: data.language ?? null,
            pageCount: data.pageCount ?? null,
            price: String(data.price),
            condition: data.condition ?? null,
            isAvailable: data.isAvailable ?? true,
            description: data.description ?? null,
            coverUrl: data.coverUrl ?? null,
            previewUrl: data.previewUrl ?? null,
            bookImages: [],
            bookCategories: [],
          };
          books.push(created as any);
          return { bookId: created.bookId };
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
        delete: jest.fn(({ where }) => {
          const index = books.findIndex((item) => item.bookId === where.bookId);
          if (index === -1) {
            return null;
          }
          const [deleted] = books.splice(index, 1);
          return { bookId: deleted.bookId };
        }),
      },
      category: {
        findMany: jest.fn(() => {
          return [...categories].sort((left, right) =>
            left.name.localeCompare(right.name),
          );
        }),
      },
      store: {
        findMany: jest.fn(() => {
          return [...stores].sort((a, b) => a.storeId - b.storeId);
        }),
        create: jest.fn(({ data }) => {
          const nextId = Math.max(0, ...stores.map((s) => s.storeId)) + 1;
          const created = {
            storeId: nextId,
            name: data.name,
            address: data.address,
            city: data.city,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            capacity: data.capacity ?? null,
            status: data.status,
          };
          stores.push(created as any);
          return created;
        }),
        findUnique: jest.fn(({ where, select }) => {
          const store = stores.find((item) => item.storeId === where.storeId) ?? null;
          if (!store) {
            return null;
          }
          if (select?.storeId) {
            return { storeId: store.storeId };
          }
          return store;
        }),
        update: jest.fn(({ where, data }) => {
          const store = stores.find((item) => item.storeId === where.storeId);
          if (!store) {
            return null;
          }
          Object.assign(store, data);
          return store;
        }),
      },
    };

    s3Mock = {
      uploadCover: jest.fn(async (_file, bookId: number) => ({
        url: `https://inkora-bucket.s3.us-east-1.amazonaws.com/books/${bookId}/covers/test-cover.webp`,
      })),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BooksModule, CategoriesModule, StoresModule],
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
      .addTag('Stores')
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
    rolesGuardSpy?.mockRestore();
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

  it('POST /books requires admin token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/books')
      .send({
        title: 'Nuevo libro',
        author: 'Autor',
        price: 10000,
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/books')
      .set('Authorization', 'Bearer client-token')
      .send({
        title: 'Nuevo libro',
        author: 'Autor',
        price: 10000,
      })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/books')
      .set('Authorization', 'Bearer root-token')
      .send({
        title: 'Nuevo libro',
        author: 'Autor',
        price: 10000,
      })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/books')
      .set('Authorization', 'Bearer admin-token')
      .send({
        title: 'Nuevo libro',
        author: 'Autor',
        price: 10000,
      })
      .expect(201);
  });

  it('DELETE /books/:id requires admin token', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/books/1')
      .expect(401);

    await request(app.getHttpServer())
      .delete('/api/v1/books/1')
      .set('Authorization', 'Bearer client-token')
      .expect(403);

    await request(app.getHttpServer())
      .delete('/api/v1/books/1')
      .set('Authorization', 'Bearer root-token')
      .expect(403);

    await request(app.getHttpServer())
      .delete('/api/v1/books/1')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
  });

  it('GET /stores requires admin token and returns stores', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/stores')
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/v1/stores')
      .set('Authorization', 'Bearer client-token')
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/stores')
      .set('Authorization', 'Bearer root-token')
      .expect(403);

    const response = await request(app.getHttpServer())
      .get('/api/v1/stores')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('storeId');
  });

  it('POST /stores creates store (admin only)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stores')
      .send({
        name: 'Nueva Tienda',
        address: 'Calle 123',
        city: 'Santiago',
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/stores')
      .set('Authorization', 'Bearer client-token')
      .send({
        name: 'Nueva Tienda',
        address: 'Calle 123',
        city: 'Santiago',
      })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/stores')
      .set('Authorization', 'Bearer root-token')
      .send({
        name: 'Nueva Tienda',
        address: 'Calle 123',
        city: 'Santiago',
      })
      .expect(403);

    const response = await request(app.getHttpServer())
      .post('/api/v1/stores')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Nueva Tienda',
        address: 'Calle 123',
        city: 'Santiago',
      })
      .expect(201);

    expect(response.body).toHaveProperty('storeId');
    expect(response.body.name).toBe('Nueva Tienda');
  });

  it('PUT /stores/:id updates store (admin only)', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/stores/1')
      .send({
        name: 'Inkora Centro Editada',
      })
      .expect(401);

    await request(app.getHttpServer())
      .put('/api/v1/stores/1')
      .set('Authorization', 'Bearer client-token')
      .send({
        name: 'Inkora Centro Editada',
      })
      .expect(403);

    await request(app.getHttpServer())
      .put('/api/v1/stores/1')
      .set('Authorization', 'Bearer root-token')
      .send({
        name: 'Inkora Centro Editada',
      })
      .expect(403);

    const response = await request(app.getHttpServer())
      .put('/api/v1/stores/1')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Inkora Centro Editada',
      })
      .expect(200);

    expect(response.body.storeId).toBe(1);
    expect(response.body.name).toBe('Inkora Centro Editada');
  });

  it('PUT /books/:id updates book (admin only)', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/books/3')
      .send({
        title: 'Disponible Dos Editado',
      })
      .expect(401);

    await request(app.getHttpServer())
      .put('/api/v1/books/3')
      .set('Authorization', 'Bearer client-token')
      .send({
        title: 'Disponible Dos Editado',
      })
      .expect(403);

    await request(app.getHttpServer())
      .put('/api/v1/books/3')
      .set('Authorization', 'Bearer root-token')
      .send({
        title: 'Disponible Dos Editado',
      })
      .expect(403);

    await request(app.getHttpServer())
      .put('/api/v1/books/3')
      .set('Authorization', 'Bearer admin-token')
      .send({
        title: 'Disponible Dos Editado',
      })
      .expect(200);
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
        expect.stringContaining('/stores'),
      ]),
    );

    const coverUploadPath = paths.find(
      (path) => path.includes('/books') && path.includes('/cover'),
    );

    expect(coverUploadPath).toBeDefined();
    expect(response.body.paths[coverUploadPath as string]).toHaveProperty('post');
  });
});