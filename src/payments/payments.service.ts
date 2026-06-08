import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeliveryMode,
  PaymentAttemptStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { PurchasesService } from '../purchases/purchases.service';
import { CreatePurchaseDto } from '../purchases/dto/create-purchase.dto';
import { PaymentGatewayService } from './payment-gateway.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentAttemptResponseDto } from './dto/payment-attempt-response.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

type PurchaseSnapshotItem = {
  bookId: number;
  quantity: number;
  unitPrice: number;
  title: string;
  author: string;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cartService: CartService,
    private readonly purchasesService: PurchasesService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  async initiatePayment(
    clientId: number,
    dto: CreatePaymentIntentDto,
  ): Promise<PaymentAttemptResponseDto> {
    if (dto.currency && dto.currency !== 'COP') {
      throw new BadRequestException('Solo se acepta la moneda COP');
    }

    if (
      dto.deliveryMode === DeliveryMode.homeDelivery &&
      !dto.shippingAddress
    ) {
      throw new BadRequestException(
        'shippingAddress es obligatorio cuando deliveryMode es homeDelivery',
      );
    }

    const cart = await this.cartService.getActiveCart(clientId);
    if (!cart.items.length) {
      throw new BadRequestException(
        'El carrito no tiene items para iniciar el pago',
      );
    }

    const client = await this.prisma.client.findUnique({
      where: { clientId },
      select: { userId: true },
    });
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${clientId} no encontrado`);
    }

    const voucherDiscount = await this.resolveVoucherDiscount(client.userId, dto.voucherCode, cart.total);
    const amount = Math.max(0, cart.total - voucherDiscount);
    const snapshot = this.buildSnapshot(cart.items);

    const paymentAttempt = await this.prisma.paymentAttempt.create({
      data: {
        clientId,
        cartId: cart.cartId,
        amount,
        currency: 'COP',
        status: PaymentAttemptStatus.pending,
        paymentMethod: dto.paymentMethod,
        deliveryMode: dto.deliveryMode,
        pickupStoreId: dto.deliveryMode === DeliveryMode.storePickup ? dto.pickupStoreId ?? null : null,
        allowWaitlistPickup: dto.allowWaitlistPickup === true,
        shippingAddress: dto.shippingAddress,
        voucherCode: dto.voucherCode,
        itemsSnapshot: snapshot as Prisma.InputJsonValue,
        checkoutUrl: null,
        expiresAt: this.getPaymentExpiryDate(),
      },
    });

    const referenceSeed = `pay-${paymentAttempt.paymentAttemptId}`;
    let gatewayReference = referenceSeed;
    let checkoutUrl = `${this.getFallbackCheckoutBaseUrl()}/${encodeURIComponent(referenceSeed)}`;

    try {
      const gatewayResult = await this.paymentGatewayService.createCheckoutSession({
        reference: referenceSeed,
        amount,
        currency: 'COP',
        description: `Pago de compra INKORA #${paymentAttempt.paymentAttemptId}`,
        customerEmail: await this.resolveClientEmail(clientId),
        redirectUrl: this.getPaymentRedirectUrl(referenceSeed),
      });

      gatewayReference = gatewayResult.reference;
      checkoutUrl = gatewayResult.checkoutUrl;

      await this.prisma.paymentAttempt.update({
        where: { paymentAttemptId: paymentAttempt.paymentAttemptId },
        data: {
          gatewayReference,
          checkoutUrl,
          gatewayStatus: 'pending',
          gatewayResponse: gatewayResult.providerResponse as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      await this.prisma.paymentAttempt.update({
        where: { paymentAttemptId: paymentAttempt.paymentAttemptId },
        data: {
          status: PaymentAttemptStatus.failed,
          failureReason: error instanceof Error ? error.message : 'No se pudo iniciar el pago',
        },
      });
      throw error;
    }

    return this.mapPaymentAttempt({
      ...paymentAttempt,
      gatewayReference,
      checkoutUrl,
    });
  }

  async handleWebhook(
    dto: PaymentWebhookDto,
    signatureHeader?: string,
  ): Promise<{ ok: true; paymentAttemptId: number; purchaseId?: number | null }> {
    const isSignatureValid = this.paymentGatewayService.verifyWebhookSignature(
      {
        gatewayReference: dto.gatewayReference,
        status: dto.status,
        amount: dto.amount,
        currency: dto.currency,
        transactionId: dto.transactionId,
        event: dto.event,
        timestamp: dto.timestamp,
      },
      signatureHeader,
    );

    if (!isSignatureValid) {
      throw new UnauthorizedException('Firma de webhook invalida');
    }

    const paymentAttempt = await this.prisma.paymentAttempt.findFirst({
      where: { gatewayReference: dto.gatewayReference },
    });

    if (!paymentAttempt) {
      throw new NotFoundException(
        `Intento de pago con referencia ${dto.gatewayReference} no encontrado`,
      );
    }

    if (paymentAttempt.status === PaymentAttemptStatus.approved) {
      return {
        ok: true,
        paymentAttemptId: paymentAttempt.paymentAttemptId,
        purchaseId: paymentAttempt.purchaseId,
      };
    }

    if (
      paymentAttempt.status !== PaymentAttemptStatus.pending &&
      paymentAttempt.status !== PaymentAttemptStatus.processing
    ) {
      return {
        ok: true,
        paymentAttemptId: paymentAttempt.paymentAttemptId,
        purchaseId: paymentAttempt.purchaseId,
      };
    }

    if (dto.status !== PaymentAttemptStatus.approved) {
      await this.prisma.paymentAttempt.update({
        where: { paymentAttemptId: paymentAttempt.paymentAttemptId },
        data: {
          status: this.mapWebhookStatus(dto.status),
          gatewayStatus: dto.status,
          failureReason: dto.event ?? 'Pago rechazado por la pasarela',
        },
      });

      return {
        ok: true,
        paymentAttemptId: paymentAttempt.paymentAttemptId,
        purchaseId: paymentAttempt.purchaseId,
      };
    }

    const claimed = await this.prisma.paymentAttempt.updateMany({
      where: {
        paymentAttemptId: paymentAttempt.paymentAttemptId,
        status: PaymentAttemptStatus.pending,
      },
      data: {
        status: PaymentAttemptStatus.processing,
        gatewayStatus: dto.status,
      },
    });

    if (claimed.count === 0) {
      const current = await this.prisma.paymentAttempt.findUnique({
        where: { paymentAttemptId: paymentAttempt.paymentAttemptId },
      });

      return {
        ok: true,
        paymentAttemptId: paymentAttempt.paymentAttemptId,
        purchaseId: current?.purchaseId ?? null,
      };
    }

    const purchaseDto = this.toCreatePurchaseDto(paymentAttempt);
    const snapshot = this.parseSnapshot(paymentAttempt.itemsSnapshot);

    try {
      const purchase = await this.purchasesService.createPurchaseFromPaymentSnapshot(
        paymentAttempt.clientId,
        purchaseDto,
        paymentAttempt.cartId,
        snapshot,
        paymentAttempt.gatewayReference ?? dto.gatewayReference,
      );

      await this.prisma.paymentAttempt.update({
        where: { paymentAttemptId: paymentAttempt.paymentAttemptId },
        data: {
          status: PaymentAttemptStatus.approved,
          purchaseId: purchase.purchaseId,
          gatewayStatus: dto.status,
          confirmedAt: new Date(),
          failureReason: null,
        },
      });

      return {
        ok: true,
        paymentAttemptId: paymentAttempt.paymentAttemptId,
        purchaseId: purchase.purchaseId,
      };
    } catch (error) {
      this.logger.error(
        `No se pudo confirmar el pago ${paymentAttempt.paymentAttemptId}: ${String(error)}`,
      );

      await this.prisma.paymentAttempt.update({
        where: { paymentAttemptId: paymentAttempt.paymentAttemptId },
        data: {
          status: PaymentAttemptStatus.failed,
          gatewayStatus: dto.status,
          failureReason: error instanceof Error ? error.message : 'No se pudo crear la compra',
        },
      });

      throw error;
    }
  }

  private async resolveVoucherDiscount(
    userId: number,
    voucherCode: string | undefined,
    totalAmount: number,
  ): Promise<number> {
    if (!voucherCode) {
      return 0;
    }

    const voucher = await this.prisma.voucher.findUnique({
      where: { code: voucherCode },
    });

    if (!voucher) {
      throw new BadRequestException('Voucher invalido');
    }

    if (voucher.userId !== userId) {
      throw new BadRequestException('Voucher no pertenece a este cliente');
    }

    if (voucher.isUsed) {
      throw new BadRequestException('Voucher ya fue usado');
    }

    if (voucher.expiresAt < new Date()) {
      throw new BadRequestException('Voucher expirado');
    }

    return (Number(voucher.discountPercentage) / 100) * totalAmount;
  }

  private async resolveClientEmail(clientId: number): Promise<string> {
    const client = await this.prisma.client.findUnique({
      where: { clientId },
      select: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!client?.user?.email) {
      throw new NotFoundException(
        `No se encontro el correo del cliente ${clientId}`,
      );
    }

    return client.user.email;
  }

  private getPaymentExpiryDate(): Date {
    const configured = this.configService.get<string>('PAYMENT_ATTEMPT_TTL_MINUTES')?.trim();
    const minutes = Number.parseInt(configured ?? '30', 10);
    const validMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 30;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + validMinutes);
    return expiresAt;
  }

  private getFallbackCheckoutBaseUrl(): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim();
    return frontendUrl ? frontendUrl.replace(/\/$/, '') : 'https://checkout.local';
  }

  private getPaymentRedirectUrl(reference: string): string {
    return `${this.getFallbackCheckoutBaseUrl()}/checkout/payment/${encodeURIComponent(reference)}`;
  }

  private buildSnapshot(items: Array<{ bookId: number; quantity: number; unitPrice: number; title: string; author: string }>): PurchaseSnapshotItem[] {
    return items.map((item) => ({
      bookId: item.bookId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      title: item.title,
      author: item.author,
    }));
  }

  private parseSnapshot(itemsSnapshot: Prisma.JsonValue): PurchaseSnapshotItem[] {
    if (!Array.isArray(itemsSnapshot)) {
      throw new BadRequestException('La fotografia del carrito es invalida');
    }

    return itemsSnapshot.map((item) => {
      const snapshotItem = item as Record<string, unknown>;
      const bookId = Number(snapshotItem.bookId);
      const quantity = Number(snapshotItem.quantity);
      const unitPrice = Number(snapshotItem.unitPrice);
      const title = String(snapshotItem.title ?? '');
      const author = String(snapshotItem.author ?? '');

      if (!Number.isFinite(bookId) || !Number.isFinite(quantity) || !Number.isFinite(unitPrice) || !title || !author) {
        throw new BadRequestException('La fotografia del carrito es invalida');
      }

      return {
        bookId,
        quantity,
        unitPrice,
        title,
        author,
      };
    });
  }

  private toCreatePurchaseDto(
    paymentAttempt: {
      paymentMethod: string | null;
      deliveryMode: DeliveryMode;
      pickupStoreId: number | null;
      allowWaitlistPickup: boolean;
      shippingAddress: string | null;
      voucherCode: string | null;
    },
  ): CreatePurchaseDto {
    return {
      deliveryMode: paymentAttempt.deliveryMode,
      pickupStoreId: paymentAttempt.pickupStoreId ?? undefined,
      allowWaitlistPickup: paymentAttempt.allowWaitlistPickup,
      paymentMethod: paymentAttempt.paymentMethod ?? undefined,
      currency: 'COP',
      shippingAddress: paymentAttempt.shippingAddress ?? undefined,
      voucherCode: paymentAttempt.voucherCode ?? undefined,
    };
  }

  private mapWebhookStatus(status: PaymentAttemptStatus): PaymentAttemptStatus {
    if (status === PaymentAttemptStatus.approved) {
      return PaymentAttemptStatus.approved;
    }

    if (status === PaymentAttemptStatus.pending) {
      return PaymentAttemptStatus.pending;
    }

    if (status === PaymentAttemptStatus.cancelled) {
      return PaymentAttemptStatus.cancelled;
    }

    if (status === PaymentAttemptStatus.expired) {
      return PaymentAttemptStatus.expired;
    }

    return PaymentAttemptStatus.failed;
  }

  private mapPaymentAttempt(paymentAttempt: {
    paymentAttemptId: number;
    status: PaymentAttemptStatus;
    amount: Prisma.Decimal | number | string;
    currency: string;
    gatewayReference: string | null;
    checkoutUrl: string | null;
    purchaseId: number | null;
    expiresAt: Date | null;
    createdAt: Date;
  }): PaymentAttemptResponseDto {
    return {
      paymentAttemptId: paymentAttempt.paymentAttemptId,
      status: paymentAttempt.status,
      amount: Number(paymentAttempt.amount),
      currency: paymentAttempt.currency,
      gatewayReference: paymentAttempt.gatewayReference,
      checkoutUrl: paymentAttempt.checkoutUrl,
      purchaseId: paymentAttempt.purchaseId,
      expiresAt: paymentAttempt.expiresAt,
      createdAt: paymentAttempt.createdAt,
    };
  }
}