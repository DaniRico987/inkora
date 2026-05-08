import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { CartService } from './cart.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

describe('CartService', () => {
  let service: CartService;
  let prismaService: any;

  const mockCartItem = {
    cartItemId: 1,
    cartId: 1,
    bookId: 5,
    quantity: 2,
    unitPrice: 19.99,
    createdAt: new Date(),
    updatedAt: new Date(),
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
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
      inventory: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { availableQuantity: 100 } }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  // ==================== GET CART ====================

  describe('getActiveCart', () => {
    it('debe retornar carrito con items formateados y totales calculados', async () => {
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

      prismaService.cart.findUnique.mockResolvedValueOnce(cartWithItems);

      const result = await service.getActiveCart(10);

      expect(result.cartId).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0].cartItemId).toBe(1);
      expect(result.items[0].title).toBe('El Quijote');
      expect(result.itemCount).toBe(1);
      expect(parseFloat(result.subtotal.toString())).toBeCloseTo(39.98);
      expect(result.total).toBeDefined();
    });

    it('debe crear carrito activo si no existe', async () => {
      prismaService.cart.findUnique.mockResolvedValueOnce(null);
      prismaService.cart.create.mockResolvedValueOnce(mockCart);
      prismaService.cart.findUnique.mockResolvedValueOnce({
        ...mockCart,
        cartItems: [],
      });

      const result = await service.getActiveCart(10);

      expect(prismaService.cart.create).toHaveBeenCalledWith({
        data: {
          clientId: 10,
          status: 'active',
        },
      });
      expect(result.items.length).toBe(0);
    });

    it('debe crear carrito vacio si no existe', async () => {
      prismaService.cart.findUnique.mockResolvedValueOnce(null);
      prismaService.cart.create.mockResolvedValueOnce(mockCart);

      const result = await service.getActiveCart(10);

      expect(result.cartId).toBe(1);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBeDefined();
    });
  });

  // ==================== ADD ITEM ====================

  describe('addItem', () => {
    it('debe agregar nuevo item al carrito', async () => {
      const dto: CreateCartItemDto = { bookId: 5, quantity: 1 };

      prismaService.book.findUnique.mockResolvedValueOnce(mockBook);
      prismaService.cart.findUnique.mockResolvedValueOnce(mockCart);
      prismaService.cartItem.findUnique.mockResolvedValueOnce(null);
      prismaService.cartItem.create.mockResolvedValueOnce({
        ...mockCartItem,
        quantity: 1,
      });

      const result = await service.addItem(10, dto);

      expect(result.cartItemId).toBe(1);
      expect(result.bookId).toBe(5);
      expect(result.quantity).toBe(1);
      expect(result.title).toBe('El Quijote');
      expect(prismaService.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 1,
          bookId: 5,
          quantity: 1,
          unitPrice: mockBook.price,
        },
      });
    });

    it('debe sumar cantidad si item ya existe en el carrito sin superar limite ni stock', async () => {
      const dto: CreateCartItemDto = { bookId: 5, quantity: 1 };

      prismaService.book.findUnique.mockResolvedValueOnce(mockBook);
      prismaService.cart.findUnique.mockResolvedValueOnce(mockCart);
      prismaService.cartItem.findUnique.mockResolvedValueOnce(mockCartItem); // quantity 2
      prismaService.cartItem.update.mockResolvedValueOnce({
        ...mockCartItem,
        quantity: 3,
      });

      const result = await service.addItem(10, dto);

      expect(result.quantity).toBe(3);
      expect(prismaService.cartItem.update).toHaveBeenCalledWith({
        where: { cartItemId: 1 },
        data: { quantity: 3 },
      });
    });

    it('debe lanzar error si libro no existe', async () => {
      const dto: CreateCartItemDto = { bookId: 999, quantity: 1 };

      prismaService.book.findUnique.mockResolvedValueOnce(null);

      await expect(service.addItem(10, dto)).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar error si libro no está disponible', async () => {
      const dto: CreateCartItemDto = { bookId: 5, quantity: 1 };
      const unavailableBook = { ...mockBook, isAvailable: false };

      prismaService.book.findUnique.mockResolvedValueOnce(unavailableBook);

      await expect(service.addItem(10, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== UPDATE ITEM ====================

  describe('updateItem', () => {
    it('debe actualizar cantidad del item', async () => {
      const dto: UpdateCartItemDto = { quantity: 3 };

      prismaService.cartItem.findUnique.mockResolvedValueOnce({
        ...mockCartItem,
        cart: { clientId: 10 },
        book: { title: mockBook.title, author: mockBook.author },
      });

      prismaService.cartItem.update.mockResolvedValueOnce({
        ...mockCartItem,
        quantity: 3,
      });

      const result = await service.updateItem(10, 1, dto);

      expect(result.quantity).toBe(3);
      expect(prismaService.cartItem.update).toHaveBeenCalledWith({
        where: { cartItemId: 1 },
        data: { quantity: 3 },
      });
    });

    it('debe lanzar error si item no existe', async () => {
      const dto: UpdateCartItemDto = { quantity: 3 };

      prismaService.cartItem.findUnique.mockResolvedValueOnce(null);

      await expect(service.updateItem(10, 999, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar error si cliente no posee el item', async () => {
      const dto: UpdateCartItemDto = { quantity: 3 };

      prismaService.cartItem.findUnique.mockResolvedValueOnce({
        ...mockCartItem,
        cart: { clientId: 99 }, // Cliente diferente
        book: { title: mockBook.title, author: mockBook.author },
      });

      await expect(service.updateItem(10, 1, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe lanzar error si cantidad es menor a 1', async () => {
      const dto: UpdateCartItemDto = { quantity: 0 };

      prismaService.cartItem.findUnique.mockResolvedValueOnce({
        ...mockCartItem,
        cart: { clientId: 10 },
        book: { title: mockBook.title, author: mockBook.author },
      });

      await expect(service.updateItem(10, 1, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.cartItem.delete).not.toHaveBeenCalled();
    });
  });

  // ==================== REMOVE ITEM ====================

  describe('removeItem', () => {
    it('debe eliminar item del carrito', async () => {
      prismaService.cartItem.findUnique.mockResolvedValueOnce({
        ...mockCartItem,
        cart: { clientId: 10 },
      });

      prismaService.cartItem.delete.mockResolvedValueOnce(mockCartItem);

      await service.removeItem(10, 1);

      expect(prismaService.cartItem.delete).toHaveBeenCalledWith({
        where: { cartItemId: 1 },
      });
    });

    it('debe lanzar error si item no existe', async () => {
      prismaService.cartItem.findUnique.mockResolvedValueOnce(null);

      await expect(service.removeItem(10, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar error si cliente no posee el item', async () => {
      prismaService.cartItem.findUnique.mockResolvedValueOnce({
        ...mockCartItem,
        cart: { clientId: 99 }, // Cliente diferente
      });

      await expect(service.removeItem(10, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ==================== CALCULATIONS ====================

  describe('calculateTotals', () => {
    it('debe calcular subtotal, impuestos (21%) y total correctamente', () => {
      const items = [
        { quantity: 2, unitPrice: 19.99 }, // 39.98
        { quantity: 1, unitPrice: 25.5 }, // 25.50
      ]; // Subtotal: 65.48

      // Vamos a llamar a la función privada para probar el cálculo
      const result = service['calculateTotals'](items);

      // subtotal = 39.98 + 25.50 = 65.48
      expect(parseFloat(result.subtotal.toString())).toBeCloseTo(65.48);

      // tax = 65.48 * 0.21 = 13.7508
      expect(parseFloat(result.tax.toString())).toBeCloseTo(13.7508, 2);

      // total = 65.48 + 13.7508
      expect(parseFloat(result.total.toString())).toBeCloseTo(79.2308, 2);
    });
  });
});
