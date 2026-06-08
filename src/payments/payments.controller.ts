import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentAttemptResponseDto } from './dto/payment-attempt-response.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Inicia un intento de pago para la compra actual',
  })
  async create(
    @Req() request: { user: AuthenticatedUser },
    @Body() dto: CreatePaymentIntentDto,
  ): Promise<PaymentAttemptResponseDto> {
    const clientId = request.user.clientId;
    if (!clientId) {
      throw new Error('No se pudo identificar el cliente autenticado');
    }

    return this.paymentsService.initiatePayment(clientId, dto);
  }

  @Post('webhook')
  @ApiOperation({
    summary: 'Recibe notificaciones de la pasarela de pago',
  })
  async webhook(
    @Body() dto: PaymentWebhookDto,
    @Headers('x-payment-signature') signature?: string,
  ): Promise<{ ok: true; paymentAttemptId: number; purchaseId?: number | null }> {
    return this.paymentsService.handleWebhook(dto, signature);
  }
}