import { Controller, Get, Param, Res, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @ApiTags('Vouchers')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Get(':id/voucher.pdf')
  @ApiOperation({ summary: 'Descargar PDF del voucher (propietario o admin)' })
  @ApiParam({ name: 'id', type: 'integer', example: 123 })
  @ApiResponse({ status: 200, description: 'PDF del voucher retornado como attachment' })
  @ApiNotFoundResponse({ description: 'Voucher no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o ausente' })
  @ApiForbiddenResponse({ description: 'No tienes permiso para acceder a este voucher' })
  async getVoucherPdf(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const voucherId = Number(id);
    const user = req.user as AuthenticatedUser;

    const voucher = await this.vouchersService.getVoucherIfAuthorized(voucherId, user);
    const base64 = voucher.pdfBase64;
    const buffer = Buffer.from(base64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=voucher-${voucherId}.pdf`);
    res.send(buffer);
  }

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validar un voucher para el checkout' })
  @ApiParam({ name: 'code', type: 'string', example: 'BIRTH-42-abc123' })
  @ApiResponse({
    status: 200,
    description: 'Voucher válido y listo para aplicar en checkout',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o ausente' })
  @ApiForbiddenResponse({ description: 'Solo los clientes pueden validar vouchers' })
  async validateVoucher(@Param('code') code: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;

    if (!user.clientId) {
      throw new ForbiddenException('Solo los clientes pueden validar vouchers');
    }

    const voucher = await this.vouchersService.validateVoucherForClient(code, user);

    return {
      code: voucher.code,
      discountPercentage: Number(voucher.discountPercentage),
      expiresAt: voucher.expiresAt,
      generatedAt: voucher.createdAt,
    };
  }
}
