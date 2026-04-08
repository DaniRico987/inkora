import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { CartModule } from '../src/cart/cart.module';
import { PrismaService } from '../prisma/prisma/prisma.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

describe('Cart (e2e)', () => {
  let app: INestApplication<App>;
  let prismaMock: any;
  let jwtGuardSpy: jest.SpyInstance;

  const mockClient = {
    clientId: 10,
    userId: 1,
    user: {
      userId: 1,
      firstName: 'Juan',
      lastName: 'Pérez',
    },
  };

  const mockBook = {
    bookId: 5,
    title: 'El Quijote',
    author: 'Miguel de Cervantes',
    price: 19.99,
    isAvailable: true,
  };

  const mockCart = {
    cartId: 1,
    clientId: 10,
    status: 'active',
    createdAt: new Date('2026-04-08T10:00:00Z'),
    updatedAt: new Date('2026-04-08T10:00:00Z'),
  };

  const mockCartItem = {
    cartItemId: 1,
    cartId: 1,
    bookId: 5,
    quantity: 2,
    unitPrice: 19.99,
    createdAt: new Date('2026-04-08T10:00:00Z'),
    updatedAt: new Date('2026-04-08T10:00:00Z'),
  };

  beforeAll(async () => {
    prismaMock = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      cartItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      book: {
        findUnique: jest.fn(),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CartModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();

    // Agregar validación global
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    // Swagger
    const config = new DocumentBuilder()
      .setTitle('Inkora API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Spy en Guards
    jwtGuardSpy = jest.spyOn(JwtAuthGuard.prototype, 'canActivate');
    jwtGuardSpy.mockResolvedValue(true);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /cart', () => {
    it('debe obtener el carrito activo del cliente', async () => {
      const cartWithItems = {
        ...mockCart,
        cartItems: [
          {
            ...mockCartItem,
            book: {
              title: mockBook.title,
              author: mockBook.author,
            },
          },
        ],
      };

      prismaMock.cart.findUnique.mockResolvedValueOnce(cartWithItems);

      const response = await request(app.getHttpServer())
        .get('/cart')
        .expect(200);

      expect(response.body.cartId).toBe(1);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].title).toBe('El Quijote');
      expect(response.body.itemCount).toBe(1);
      expect(response.body.subtotal).toBeDefined();
      expect(response.body.total).toBeDefined();
    });

    it('debe crear un carrito activo si no existe', async () => {
      prismaMock.cart.findUnique.mockResolvedValueOnce(null);
      prismaMock.cart.create.mockResolvedValueOnce(mockCart);
      prismaMock.cart.findUnique.mockResolvedValueOnce({
        ...mockCart,
        cartItems: [],
      });

      const response = await request(app.getHttpServer())
        .get('/cart')
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(prismaMock.cart.create).toHaveBeenCalledWith({
        data: {
          clientId: 10,
          status: 'active',
        },
      });
    });

    it('debe retornar 401 si no hay JWT válido', async () => {
      jwtGuardSpy.mockResolvedValueOnce(false);

      const response = await request(app.getHttpServer())
        .get('/cart');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /cart/items', () => {
    it('debe agregar un item al carrito', async () => {
      prismaMock.book.findUnique.mockResolvedValueOnce(mockBook);
      prismaMock.cart.findUnique.mockResolvedValueOnce(mockCart);
      prismaMock.cartItem.findUnique.mockResolvedValueOnce(null);
      prismaMock.cartItem.create.mockResolvedValueOnce({
        ...mockCartItem,
        quantity: 1,
      });

      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .send({
          bookId: 5,
          quantity: 1,
        })
        .expect(201);

      expect(response.body.cartItemId).toBe(1);
      expect(response.body.bookId).toBe(5);
      expect(response.body.title).toBe('El Quijote');
      expect(response.body.quantity).toBe(1);
    });

    it('debe sumar cantidad si el item ya existe', async () => {
      prismaMock.book.findUnique.mockResolvedValueOnce(mockBook);
      prismaMock.cart.findUnique.mockResolvedValueOnce(mockCart);
      prismaMock.cartItem.findUnique.mockResolvedValueOnce(mockCartItem);
      prismaMock.cartItem.update.mockResolvedValueOnce({
        ...mockCartItem,
        quantity: 3,
      });

      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .send({
          bookId: 5,
          quantity: 1,
        })
        .expect(201);

      expect(response.body.quantity).toBe(3);
      expect(prismaMock.cartItem.update).toHaveBeenCalled();
    });

    it('debe retornar 404 si el libro no existe', async () => {
      prismaMock.book.findUnique.mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .send({
          bookId: 999,
          quantity: 1,
        })
        .expect(404);

      expect(response.body.message).toContain('Libro con ID 999 no encontrado');
    });

    it('debe retornar 400 si el libro no está disponible', async () => {
      prismaMock.book.findUnique.mockResolvedValueOnce({
        ...mockBook,
        isAvailable: false,
      });

      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .send({
          bookId: 5,
          quantity: 1,
        })
        .expect(400);

      expect(response.body.message).toContain('no está disponible');
    });

    it('debe retornar 400 si bookId es inválido', async () => {
      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .send({
          bookId: 'invalid',
          quantity: 1,
        })
        .expect(400);

      expect(response.body.message).toContain('bookId debe ser un entero');
    });

    it('debe retornar 400 si quantity es menor a 1', async () => {
      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .send({
          bookId: 5,
          quantity: 0,
        })
        .expect(400);

      expect(response.body.message).toContain('quantity debe ser al menos 1');
    });
  });

  describe('PATCH /cart/items/:id', () => {
    it('debe actualizar la cantidad del item', async () => {
      prismaMock.cartItem.findUnique.mockResolvedValueOnce({
        ...mockCartItem,
        cart: { clientId: 10 },
        book: { title: mockBook.title, author: mockBook.author },
      });
      prismaMock.cartItem.update.mockResolvedValueOnce({
        ...mockCartItem,
        quantity: 5,
      });

      const response = await request(app.getHttpServer())
        .patch('/cart/items/1')
        .send({
          quantity: 5,
        })
        .expect(200);

      expect(response.body.quantity).toBe(5);
    });

    it('debe retornar 404 si el item no existe', async () => {
      prismaMock.cartItem.findUnique.mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .patch('/cart/items/999')
        .send({
          quantity: 5,
        })
        .expect(404);

      expect(response.body.message).toContain('Item con ID 999 no encontrado');
    });

    it('debe retornar 403 si el cliente no posee el item', async () => {
      prismaMock.cartItem.findUnique.mockResolvedValueOnce({
        ...mockCartItem,
        cart: { clientId: 99 }, // Cliente diferente
        book: { title: mockBook.title, author: mockBook.author },
      });

      const response = await request(app.getHttpServer())
        .patch('/cart/items/1')
        .send({
          quantity: 5,
        })
        .expect(403);

      expect(response.body.message).toContain('No tienes permiso');
    });

    it('debe retornar 400 si quantity es 0', async () => {
      prismaMock.cartItem.findUnique.mockResolvedValueOnce({
        ...mockCartItem,
        cart: { clientId: 10 },
        book: { title: mockBook.title, author: mockBook.author },
      });
      prismaMock.cartItem.delete.mockResolvedValueOnce(mockCartItem);

      const response = await request(app.getHttpServer())
        .patch('/cart/items/1')
        .send({
          quantity: 0,
        })
        .expect(400);

      expect(response.body.message).toContain('DELETE');
    });
  });

  describe('DELETE /cart/items/:id', () => {
    it('debe eliminar un item del carrito', async () => {
      prismaMock.cartItem.findUnique.mockResolvedValueOnce({
        ...mockCartItem,
        cart: { clientId: 10 },
      });
      prismaMock.cartItem.delete.mockResolvedValueOnce(mockCartItem);

      const response = await request(app.getHttpServer())
        .delete('/cart/items/1')
        .expect(204);

      expect(response.body).toEqual({});
      expect(prismaMock.cartItem.delete).toHaveBeenCalledWith({
        where: { cartItemId: 1 },
      });
    });

    it('debe retornar 404 si el item no existe', async () => {
      prismaMock.cartItem.findUnique.mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .delete('/cart/items/999')
        .expect(404);

      expect(response.body.message).toContain('Item con ID 999 no encontrado');
    });

    it('debe retornar 403 si el cliente no posee el item', async () => {
      prismaMock.cartItem.findUnique.mockResolvedValueOnce({
        ...mockCartItem,
        cart: { clientId: 99 }, // Cliente diferente
      });

      const response = await request(app.getHttpServer())
        .delete('/cart/items/1')
        .expect(403);

      expect(response.body.message).toContain('No tienes permiso');
    });
  });
});
