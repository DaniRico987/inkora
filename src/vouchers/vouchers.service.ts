import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VouchersService {
  private readonly logger = new Logger(VouchersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  private async generatePdfBase64(firstName: string, code: string, expiresAt: Date) {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.fontSize(20).text('Feliz Cumpleanos', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Hola ${firstName},`, { align: 'left' });
    doc.moveDown();
    doc.fontSize(12).text(`Felicitaciones en tu dia. Usa el siguiente bono para obtener un descuento especial:`);
    doc.moveDown();
    doc.fontSize(16).text(`Codigo: ${code}`, { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Vigente hasta: ${expiresAt.toISOString()}`);

    return await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      // accumulate PDF stream chunks
      // 'data' events provide Buffer or string; ensure Buffer
      doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
      doc.on('error', (err) => reject(err));
      doc.end();
    });
  }

  async createBirthdayVoucher(user: any) {
    const code = `BIRTH-${user.userId}-${Date.now().toString(36)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const pdfBase64 = await this.generatePdfBase64(
      user.firstName,
      code,
      expiresAt,
    );

    const voucher = await this.prisma.voucher.create({
      data: {
        code,
        discountPercentage: 10,
        expiresAt,
        pdfBase64,
        userId: user.userId,
      },
    });

    const apiUrl = this.config.get<string>('API_URL') || 'http://localhost:3000';
    const voucherUrl = `${apiUrl.replace(/\/$/, '')}/vouchers/${voucher.id}/voucher.pdf`;

    try {
      await this.mailService.sendBirthdayVoucher(
        user.email,
        user.firstName,
        voucherUrl,
        voucher.code,
      );
    } catch (err) {
      this.logger.error('Error al enviar correo de bono de cumpleanos', err as any);
    }

    return voucher;
  }

  async getVoucherPdfBase64(voucherId: number) {
    const v = await this.prisma.voucher.findUnique({ where: { id: voucherId } });
    if (!v) return null;
    return v.pdfBase64;
  }

  async getVoucherIfAuthorized(voucherId: number, user: any) {
    const v = await this.prisma.voucher.findUnique({ where: { id: voucherId } });
    if (!v) throw new NotFoundException('Voucher no encontrado');

    const isAdmin = user?.userType === 'admin' || user?.userType === 'root';
    if (!isAdmin) {
      // voucher.userId stores the userId (not clientId)
      if (v.userId !== user.userId) {
        throw new ForbiddenException('No tienes permiso para acceder a este voucher');
      }
    }

    return v;
  }
}
