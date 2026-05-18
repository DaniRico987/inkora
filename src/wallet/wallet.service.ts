import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { GetWalletTransactionsQueryDto } from './dto/get-wallet-transactions-query.dto';
import { WalletSummaryDto } from './dto/wallet-summary.dto';
import { WalletTransactionDto } from './dto/wallet-transaction.dto';
import { WalletTransactionsResponseDto } from './dto/wallet-transactions-response.dto';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number.parseFloat(value);
  }

  return Number.parseFloat(String(value));
};

type WalletMovementInput = {
  clientId: number;
  amount: number;
  purchaseId?: number | null;
  refundId?: number | null;
  gatewayReference?: string | null;
};

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(clientId: number): Promise<WalletSummaryDto> {
    const [client, lastTransaction, totalTransactions, paymentTotals, refundTotals] =
      await Promise.all([
        this.prisma.client.findUnique({
          where: { clientId },
          select: {
            clientId: true,
            walletBalance: true,
            paymentCards: {
              where: { isActive: true },
              select: { cardId: true },
            },
          },
        }),
        this.prisma.transaction.findFirst({
          where: { clientId },
          orderBy: { transactionDate: 'desc' },
        }),
        this.prisma.transaction.count({ where: { clientId } }),
        this.prisma.transaction.aggregate({
          where: { clientId, transactionType: TransactionType.payment },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: { clientId, transactionType: TransactionType.refund },
          _sum: { amount: true },
        }),
      ]);

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return {
      clientId: client.clientId,
      availableBalance: toNumber(client.walletBalance),
      totalPayments: toNumber(paymentTotals._sum.amount),
      totalRefunds: toNumber(refundTotals._sum.amount),
      transactionCount: totalTransactions,
      activeCardsCount: client.paymentCards.length,
      lastTransaction: lastTransaction
        ? {
            transactionId: lastTransaction.transactionId,
            transactionType: lastTransaction.transactionType,
            amount: toNumber(lastTransaction.amount),
            balanceAfter: toNumber(lastTransaction.balanceAfter),
            transactionDate: lastTransaction.transactionDate,
          }
        : null,
    };
  }

  async getWalletTransactions(
    clientId: number,
    query: GetWalletTransactionsQueryDto,
  ): Promise<WalletTransactionsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('from no puede ser mayor que to');
    }

    const where: Prisma.TransactionWhereInput = {
      clientId,
      ...(query.type ? { transactionType: query.type } : {}),
      ...(query.from || query.to
        ? {
            transactionDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [total, transactions] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: transactions.map((transaction) => this.mapTransaction(transaction)),
      page,
      limit,
      total,
    };
  }

  async recordPurchaseTransaction(
    tx: Prisma.TransactionClient,
    input: WalletMovementInput,
  ): Promise<void> {
    await this.recordMovement(tx, {
      ...input,
      transactionType: TransactionType.payment,
    });
  }

  async recordRefundTransaction(
    tx: Prisma.TransactionClient,
    input: WalletMovementInput,
  ): Promise<void> {
    await this.recordMovement(tx, {
      ...input,
      transactionType: TransactionType.refund,
    });
  }

  private async recordMovement(
    tx: Prisma.TransactionClient,
    input: WalletMovementInput & { transactionType: TransactionType },
  ): Promise<void> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new BadRequestException('amount debe ser mayor a cero');
    }

    const nextWalletBalance = await tx.client.update({
      where: { clientId: input.clientId },
      data:
        input.transactionType === TransactionType.payment
          ? { walletBalance: { decrement: input.amount } }
          : { walletBalance: { increment: input.amount } },
      select: { walletBalance: true },
    });

    await tx.transaction.create({
      data: {
        clientId: input.clientId,
        purchaseId: input.purchaseId ?? null,
        refundId: input.refundId ?? null,
        transactionType: input.transactionType,
        amount: input.amount,
        balanceAfter: nextWalletBalance.walletBalance,
        gatewayReference: input.gatewayReference ?? null,
      },
    });
  }

  private mapTransaction(transaction: {
    transactionId: number;
    transactionType: TransactionType;
    amount: unknown;
    balanceAfter: unknown;
    transactionDate: Date;
    purchaseId: number | null;
    refundId: number | null;
    gatewayReference: string | null;
  }): WalletTransactionDto {
    return {
      transactionId: transaction.transactionId,
      transactionType: transaction.transactionType,
      amount: toNumber(transaction.amount),
      balanceAfter: toNumber(transaction.balanceAfter),
      transactionDate: transaction.transactionDate,
      purchaseId: transaction.purchaseId,
      refundId: transaction.refundId,
      gatewayReference: transaction.gatewayReference,
    };
  }
}