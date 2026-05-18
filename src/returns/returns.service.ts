import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PurchaseStatus, ReturnReason, ReturnStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AdminReturnRequestDto } from './dto/admin-return-request.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { ReturnResponseDto } from './dto/return-response.dto';

const DEFAULT_RETURN_WINDOW_DAYS = 30;

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async createReturnRequest(
    clientId: number,
    dto: CreateReturnRequestDto,
  ): Promise<ReturnResponseDto> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { purchaseId: dto.purchaseId },
      select: {
        purchaseId: true,
        clientId: true,
        status: true,
        purchaseDate: true,
        dispatchDate: true,
        returnBook: {
          select: {
            returnBookId: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException(
        `Compra con ID ${dto.purchaseId} no encontrada`,
      );
    }

    if (purchase.clientId !== clientId) {
      throw new ForbiddenException(
        'No tienes permiso para solicitar devolucion de esta compra',
      );
    }

    if (purchase.status !== PurchaseStatus.delivered) {
      throw new BadRequestException(
        'Solo se puede solicitar devolucion para compras en estado delivered',
      );
    }

    if (purchase.returnBook) {
      throw new BadRequestException(
        'La compra ya tiene una solicitud de devolucion registrada',
      );
    }

    this.ensureReturnWindow(purchase.purchaseDate, purchase.dispatchDate);

    const created = await this.prisma.returnBook.create({
      data: {
        purchaseId: dto.purchaseId,
        clientId,
        reason: dto.reason,
        additionalDescription: this.normalizeOptionalText(
          dto.additionalDescription,
        ),
        status: ReturnStatus.pending,
      },
    });

    return created;
  }

  async getPendingReturnRequests(): Promise<AdminReturnRequestDto[]> {
    const requests = await this.prisma.returnBook.findMany({
      where: { status: ReturnStatus.pending },
      include: {
        client: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        purchase: {
          select: {
            purchaseDate: true,
            totalAmount: true,
            purchaseItems: {
              select: {
                purchaseItemId: true,
                bookId: true,
                quantity: true,
                book: {
                  select: {
                    title: true,
                    author: true,
                    coverUrl: true,
                    previewUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        requestDate: 'asc',
      },
    });

    return requests.map((request) => ({
      returnBookId: request.returnBookId,
      purchaseId: request.purchaseId,
      clientId: request.clientId,
      clientName: `${request.client.user.firstName} ${request.client.user.lastName}`.trim(),
      clientEmail: request.client.user.email,
      reason: request.reason,
      reasonLabel: this.getReasonLabel(request.reason),
      additionalDescription: request.additionalDescription,
      status: request.status,
      requestDate: request.requestDate,
      approvalDate: request.approvalDate,
      qrCodeUrl: request.qrCodeUrl,
      purchaseDate: request.purchase.purchaseDate,
      totalAmount: Number(request.purchase.totalAmount),
      items: request.purchase.purchaseItems.map((item) => ({
        purchaseItemId: item.purchaseItemId,
        bookId: item.bookId,
        title: item.book.title,
        author: item.book.author,
        quantity: item.quantity,
        coverUrl: item.book.coverUrl,
        previewUrl: item.book.previewUrl,
      })),
    }));
  }

  async approveReturnRequest(returnBookId: number): Promise<ReturnResponseDto> {
    const current = await this.prisma.returnBook.findUnique({
      where: { returnBookId },
      include: {
        client: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
              },
            },
          },
        },
      },
    });

    if (!current) {
      throw new NotFoundException(
        `Solicitud de devolucion con ID ${returnBookId} no encontrada`,
      );
    }

    if (current.status !== ReturnStatus.pending) {
      throw new BadRequestException(
        'Solo se pueden aprobar solicitudes en estado pending',
      );
    }

    const validationCode = this.buildValidationCode(current.returnBookId);
    const qrPayload = JSON.stringify({
      returnId: current.returnBookId,
      purchaseId: current.purchaseId,
      clientId: current.clientId,
      code: validationCode,
      issuedAt: new Date().toISOString(),
      nonce: randomUUID(),
    });
    const qrCodeDataUrl = await this.generateQrAsDataUrl(qrPayload);

    const approved = await this.prisma.returnBook.update({
      where: { returnBookId },
      data: {
        status: ReturnStatus.approved,
        approvalDate: new Date(),
        qrCodeUrl: qrCodeDataUrl,
      },
    });

    await this.mailService
      .sendReturnApprovedEmail(current.client.user.email, {
        firstName: current.client.user.firstName,
        returnBookId: current.returnBookId,
        purchaseId: current.purchaseId,
        reasonLabel: this.getReasonLabel(current.reason),
        additionalDescription: current.additionalDescription ?? undefined,
        validationCode,
        qrCodeDataUrl,
      })
      .catch((error) => {
        this.logger.error(
          `No se pudo enviar correo de aprobacion para devolucion ${current.returnBookId}: ${String(error)}`,
        );
      });

    return approved;
  }

  async rejectReturnRequest(
    returnBookId: number,
    adminNote?: string | null,
  ): Promise<ReturnResponseDto> {
    const current = await this.prisma.returnBook.findUnique({
      where: { returnBookId },
      include: {
        client: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
              },
            },
          },
        },
      },
    });

    if (!current) {
      throw new NotFoundException(
        `Solicitud de devolucion con ID ${returnBookId} no encontrada`,
      );
    }

    if (current.status !== ReturnStatus.pending) {
      throw new BadRequestException(
        'Solo se pueden rechazar solicitudes en estado pending',
      );
    }

    const rejected = await this.prisma.returnBook.update({
      where: { returnBookId },
      data: {
        status: ReturnStatus.rejected,
        adminNote: adminNote ?? null,
        decisionDate: new Date(),
        approvalDate: new Date(),
      },
    });

    // Optionally notify the client about the rejection. We log failures but
    // don't block the operation if email sending fails.
    await this.mailService
      .sendReturnRejectedEmail(current.client.user.email, {
        firstName: current.client.user.firstName,
        returnBookId: current.returnBookId,
        purchaseId: current.purchaseId,
        reasonLabel: this.getReasonLabel(current.reason),
        additionalDescription: current.additionalDescription ?? undefined,
        adminNote: adminNote ?? undefined,
      })
      .catch((error) => {
        this.logger.error(
          `No se pudo enviar correo de rechazo para devolucion ${current.returnBookId}: ${String(
            error,
          )}`,
        );
      });

    return rejected;
  }

  private ensureReturnWindow(
    purchaseDate: Date,
    dispatchDate: Date | null,
  ): void {
    const now = new Date();
    const baseDate = dispatchDate ?? purchaseDate;
    const maxDays = this.getReturnWindowDays();
    const expiresAt = new Date(baseDate);
    expiresAt.setDate(expiresAt.getDate() + maxDays);

    if (now.getTime() > expiresAt.getTime()) {
      throw new BadRequestException(
        `El plazo maximo de ${maxDays} dias para solicitar devolucion ya vencio`,
      );
    }
  }

  private getReturnWindowDays(): number {
    const configured = this.configService
      .get<string>('RETURN_REQUEST_MAX_DAYS')
      ?.trim();

    if (!configured) {
      return DEFAULT_RETURN_WINDOW_DAYS;
    }

    const parsed = Number.parseInt(configured, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_RETURN_WINDOW_DAYS;
    }

    return parsed;
  }

  private normalizeOptionalText(value?: string): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private getReasonLabel(reason: ReturnReason | null): string {
    if (reason === ReturnReason.badCondition) {
      return 'Producto en mal estado';
    }
    if (reason === ReturnReason.didNotMeetExpectations) {
      return 'No lleno las expectativas';
    }
    if (reason === ReturnReason.lateDelivery) {
      return 'Entrega fuera de tiempo';
    }

    return 'No informado';
  }

  private buildValidationCode(returnBookId: number): string {
    const entropy = randomUUID().slice(0, 8).toUpperCase();
    return `RET-${returnBookId}-${entropy}`;
  }

  private async generateQrAsDataUrl(payload: string): Promise<string> {
    return QRCode.toDataURL(payload, {
      type: 'image/png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512,
    });
  }
}
