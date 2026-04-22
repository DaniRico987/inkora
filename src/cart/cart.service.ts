import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { GetCartResponseDto } from './dto/get-cart-response.dto';
import { CartItemResponseDto } from './dto/cart-item-response.dto';

const convertToNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return parseFloat(value.toString());
};

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene el carrito activo del cliente con todos los detalles
   * @param clientId ID del cliente autenticado
   * @returns DTO con carrito formateado y totales calculados
   */
  async getActiveCart(clientId: number): Promise<GetCartResponseDto> {
    // Obtener carrito con items
    let cart = await this.prisma.cart.findUnique({
      where: {
        clientId,
      },
      include: {
        cartItems: {
          include: {
            book: {
              select: {
                title: true,
                author: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      let createdCart;
      try {
        createdCart = await this.prisma.cart.create({
          data: {
            clientId,
            status: 'active',
          },
        });
      } catch (error) {
        this.rethrowIfMissingClientProfile(error);
        throw error;
      }

      cart = {
        ...createdCart,
        cartItems: [],
      };
    }

    // Mapear items y calcular subtotales
    const items = cart.cartItems.map((item) => {
      const unitPrice = convertToNumber(item.unitPrice);
      const subtotal = item.quantity * unitPrice;
      return {
        cartItemId: item.cartItemId,
        bookId: item.bookId,
        title: item.book.title,
        author: item.book.author,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    // Calcular totales
    const { subtotal, tax, total } = this.calculateTotals(items);

    return {
      cartId: cart.cartId,
      items,
      subtotal,
      tax,
      total,
      itemCount: items.length,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * Agrega un libro al carrito del cliente
   * Si el libro ya existe, suma la cantidad
   * @param clientId ID del cliente autenticado
   * @param dto CreateCartItemDto con bookId y quantity
   * @returns Item aggregado/actualizado
   */
  async addItem(
    clientId: number,
    dto: CreateCartItemDto,
  ): Promise<CartItemResponseDto> {
    // Validar que el libro existe y está disponible
    const book = await this.prisma.book.findUnique({
      where: { bookId: dto.bookId },
      select: {
        bookId: true,
        title: true,
        author: true,
        price: true,
        isAvailable: true,
      },
    });

    if (!book) {
      throw new NotFoundException(`Libro con ID ${dto.bookId} no encontrado`);
    }

    if (!book.isAvailable) {
      throw new BadRequestException(
        `El libro "${book.title}" no está disponible`,
      );
    }

    // Asegurar que existe carrito activo
    const cartId = await this.ensureActiveCart(clientId);

    // Verificar si el item ya existe en el carrito
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_bookId: {
          cartId,
          bookId: dto.bookId,
        },
      },
    });

    let cartItem;

    if (existingItem) {
      // Actualizar cantidad
      cartItem = await this.prisma.cartItem.update({
        where: { cartItemId: existingItem.cartItemId },
        data: {
          quantity: existingItem.quantity + dto.quantity,
        },
      });
    } else {
      // Crear nuevo item
      cartItem = await this.prisma.cartItem.create({
        data: {
          cartId,
          bookId: dto.bookId,
          quantity: dto.quantity,
          unitPrice: book.price,
        },
      });
    }

    const unitPrice = convertToNumber(cartItem.unitPrice);
    const subtotal = cartItem.quantity * unitPrice;

    return {
      cartItemId: cartItem.cartItemId,
      bookId: cartItem.bookId,
      title: book.title,
      author: book.author,
      quantity: cartItem.quantity,
      unitPrice,
      subtotal,
      createdAt: cartItem.createdAt,
      updatedAt: cartItem.updatedAt,
    };
  }

  /**
   * Actualiza la cantidad de un item en el carrito
   * @param clientId ID del cliente autenticado
   * @param cartItemId ID del item a actualizar
   * @param dto UpdateCartItemDto con nueva cantidad
   * @returns Item actualizado
   */
  async updateItem(
    clientId: number,
    cartItemId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartItemResponseDto> {
    // Verificar que el item pertenece al carrito del cliente
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { cartItemId },
      include: {
        cart: {
          select: { clientId: true },
        },
        book: {
          select: {
            title: true,
            author: true,
          },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException(`Item con ID ${cartItemId} no encontrado`);
    }

    if (cartItem.cart.clientId !== clientId) {
      throw new ForbiddenException(
        'No tienes permiso para actualizar este item',
      );
    }

    // Si cantidad es 0, eliminar el item
    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({
        where: { cartItemId },
      });
      throw new BadRequestException(
        'Usa DELETE para eliminar el item del carrito',
      );
    }

    if (dto.quantity < 1) {
      throw new BadRequestException('La cantidad debe ser al menos 1');
    }

    // Actualizar cantidad
    const updatedItem = await this.prisma.cartItem.update({
      where: { cartItemId },
      data: { quantity: dto.quantity },
    });

    const unitPrice = convertToNumber(updatedItem.unitPrice);
    const subtotal = updatedItem.quantity * unitPrice;

    return {
      cartItemId: updatedItem.cartItemId,
      bookId: updatedItem.bookId,
      title: cartItem.book.title,
      author: cartItem.book.author,
      quantity: updatedItem.quantity,
      unitPrice,
      subtotal,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
    };
  }

  /**
   * Elimina un item del carrito del cliente
   * @param clientId ID del cliente autenticado
   * @param cartItemId ID del item a eliminar
   */
  async removeItem(clientId: number, cartItemId: number): Promise<void> {
    // Verificar que el item pertenece al carrito del cliente
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { cartItemId },
      include: {
        cart: {
          select: { clientId: true },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException(`Item con ID ${cartItemId} no encontrado`);
    }

    if (cartItem.cart.clientId !== clientId) {
      throw new ForbiddenException('No tienes permiso para eliminar este item');
    }

    await this.prisma.cartItem.delete({
      where: { cartItemId },
    });
  }

  /**
   * Calcula el subtotal, impuestos y total del carrito
   * Impuestos fijos al 21% (Argentina)
   * @param items Array de items con quantities y precios
   * @returns Objeto con subtotal, tax y total
   */
  private calculateTotals(
    items: Array<{ quantity: number; unitPrice: number }>,
  ): { subtotal: number; tax: number; total: number } {
    // Calcular subtotal
    const subtotal = items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);

    // Calcular impuestos (21%)
    const tax = subtotal * 0.21;

    // Total
    const total = subtotal + tax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  /**
   * Asegura que existe un carrito activo para el cliente
   * Si no existe, lo crea
   * @param clientId ID del cliente
   * @returns cartId del carrito activo
   */
  private async ensureActiveCart(clientId: number): Promise<number> {
    let cart = await this.prisma.cart.findUnique({
      where: { clientId },
    });

    if (!cart) {
      try {
        cart = await this.prisma.cart.create({
          data: {
            clientId,
            status: 'active',
          },
        });
      } catch (error) {
        this.rethrowIfMissingClientProfile(error);
        throw error;
      }
    } else if (cart.status !== 'active') {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.cartId },
      });

      cart = await this.prisma.cart.update({
        where: { cartId: cart.cartId },
        data: {
          status: 'active',
        },
      });
    }

    return cart.cartId;
  }

  private rethrowIfMissingClientProfile(error: unknown): never | void {
    const prismaErrorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : null;

    if (prismaErrorCode === 'P2003') {
      throw new ForbiddenException(
        'El usuario autenticado no tiene un perfil de cliente valido para usar el carrito',
      );
    }
  }
}
