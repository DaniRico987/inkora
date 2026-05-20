import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, RefundStatus, ReturnStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { RefundResponseDto } from './dto/refund-response.dto';

const DEFAULT_REFUND_WINDOW_DAYS = 7;

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
  ) {}

  async createAutomaticRefund(returnBookId: number): Promise<RefundResponseDto> {
    const current = await this.prisma.returnBook.findUnique({
      where: { returnBookId },
      select: {
        returnBookId: true,
        clientId: true,
        status: true,
        refund: {
          select: {
            refundId: true,
            returnId: true,
            purchaseId: true,
            amount: true,
            refundMethod: true,
            requestDate: true,
            status: true,
          },
        },
        purchase: {
          select: {
            purchaseId: true,
            clientId: true,
            purchaseDate: true,
            totalAmount: true,
            paymentMethod: true,
          },
        },
      },
    });

    if (!current) {
      throw new NotFoundException(
        `Solicitud de devolucion con ID ${returnBookId} no encontrada`,
      );
    }

    if (current.status !== ReturnStatus.approved) {
      throw new BadRequestException(
        'Solo se puede generar reembolso para devoluciones aprobadas',
      );
    }

    if (current.refund) {
      return this.mapRefund(current.refund);
    }

    const amount = this.toNumber(current.purchase.totalAmount);
    const refundMethod = current.purchase.paymentMethod?.trim() || 'monedero';
    const isWithinWindow = this.isWithinRefundWindow(current.purchase.purchaseDate);

    const created = await this.prisma.refund.create({
      data: {
        returnId: current.returnBookId,
        purchaseId: current.purchase.purchaseId,
        amount,
        status: isWithinWindow ? RefundStatus.pending : RefundStatus.rejected,
        refundMethod: isWithinWindow ? null : refundMethod,
      },
    });

    if (!isWithinWindow) {
      return this.mapRefund(created);
    }

    return this.processRefund(created.refundId);
  }

  async createRefundRequest(
    clientId: number,
    dto: CreateRefundRequestDto,
  ): Promise<RefundResponseDto> {
    const returnBook = await this.prisma.returnBook.findUnique({
      where: { returnBookId: dto.returnBookId },
      select: {
        returnBookId: true,
        clientId: true,
        status: true,
        refund: {
          select: {
            refundId: true,
          },
        },
        purchase: {
          select: {
            purchaseId: true,
            clientId: true,
            purchaseDate: true,
            totalAmount: true,
            paymentMethod: true,
          },
        },
      },
    });

    if (!returnBook) {
      throw new NotFoundException(
        `Solicitud de devolucion con ID ${dto.returnBookId} no encontrada`,
      );
    }

    if (returnBook.clientId !== clientId || returnBook.purchase.clientId !== clientId) {
      throw new ForbiddenException(
        'No tienes permiso para solicitar reembolso de esta devolucion',
      );
    }

    if (returnBook.status !== ReturnStatus.approved) {
      throw new BadRequestException(
        'Solo se puede solicitar reembolso para devoluciones aprobadas',
      );
    }

    if (returnBook.refund) {
      throw new BadRequestException(
        'La devolucion ya tiene un reembolso registrado',
      );
    }

    this.ensureRefundWindow(returnBook.purchase.purchaseDate);

    const created = await this.prisma.refund.create({
      data: {
        returnId: returnBook.returnBookId,
        purchaseId: returnBook.purchase.purchaseId,
        amount: this.toNumber(returnBook.purchase.totalAmount),
        status: RefundStatus.pending,
      },
    });

    return this.mapRefund(created);
  }

  async processRefund(refundId: number): Promise<RefundResponseDto> {
    const refund = await this.prisma.refund.findUnique({
      where: { refundId },
      include: {
        purchase: {
          select: {
            purchaseId: true,
            clientId: true,
            paymentMethod: true,
          },
        },
        returnBook: {
          select: {
            returnBookId: true,
            status: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException(`Reembolso con ID ${refundId} no encontrado`);
    }

    if (refund.status !== RefundStatus.pending) {
      throw new BadRequestException(
        'Solo se pueden procesar reembolsos en estado pending',
      );
    }

    if (refund.returnBook.status !== ReturnStatus.approved) {
      throw new BadRequestException(
        'El reembolso requiere una devolucion aprobada',
      );
    }

    const refundMethod = refund.purchase.paymentMethod?.trim() || 'monedero';
    const amount = this.toNumber(refund.amount);

    const processed = await this.prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refund.update({
        where: { refundId },
        data: {
          status: RefundStatus.processed,
          refundMethod,
        },
      });

      await this.walletService.recordRefundTransaction(tx, {
        clientId: refund.purchase.clientId,
        amount,
        refundId: updatedRefund.refundId,
        gatewayReference: refundMethod,
      });

      return updatedRefund;
    });

    return this.mapRefund(processed);
  }

  private ensureRefundWindow(purchaseDate: Date): void {
    if (!this.isWithinRefundWindow(purchaseDate)) {
      const maxDays = this.getRefundWindowDays();
      throw new BadRequestException(
        `El plazo maximo de ${maxDays} dias para solicitar reembolso ya vencio`,
      );
    }
  }

  private isWithinRefundWindow(purchaseDate: Date): boolean {
    const now = new Date();
    const maxDays = this.getRefundWindowDays();
    const expiresAt = new Date(purchaseDate);
    expiresAt.setDate(expiresAt.getDate() + maxDays);

    return now.getTime() <= expiresAt.getTime();
  }

  private getRefundWindowDays(): number {
    const configured = this.configService
      .get<string>('REFUND_REQUEST_MAX_DAYS')
      ?.trim();

    if (!configured) {
      return DEFAULT_REFUND_WINDOW_DAYS;
    }

    const parsed = Number.parseInt(configured, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_REFUND_WINDOW_DAYS;
    }

    return parsed;
  }

  private toNumber(value: Prisma.Decimal | number | string): number {
    return Number(value);
  }

  private mapRefund(refund: {
    refundId: number;
    returnId: number;
    purchaseId: number;
    amount: Prisma.Decimal | number | string;
    refundMethod: string | null;
    requestDate: Date;
    status: RefundStatus;
  }): RefundResponseDto {
    return {
      refundId: refund.refundId,
      returnId: refund.returnId,
      purchaseId: refund.purchaseId,
      amount: this.toNumber(refund.amount),
      refundMethod: refund.refundMethod,
      requestDate: refund.requestDate,
      status: refund.status,
    };
  }
}