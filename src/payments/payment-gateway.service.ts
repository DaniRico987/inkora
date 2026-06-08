import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export type CreatePaymentSessionInput = {
  reference: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  redirectUrl: string;
};

export type CreatePaymentSessionResult = {
  reference: string;
  checkoutUrl: string;
  providerResponse: Record<string, unknown>;
};

export type PaymentWebhookSignaturePayload = {
  gatewayReference?: string;
  status?: string;
  amount?: number;
  currency?: string;
  transactionId?: string;
  event?: string;
  timestamp?: string;
};

@Injectable()
export class PaymentGatewayService {
  constructor(private readonly configService: ConfigService) {}

  async createCheckoutSession(
    input: CreatePaymentSessionInput,
  ): Promise<CreatePaymentSessionResult> {
    const baseUrl = this.configService.get<string>('PAYMENT_GATEWAY_BASE_URL')?.trim();
    const apiKey = this.configService.get<string>('PAYMENT_GATEWAY_API_KEY')?.trim();
    const mockMode = this.isMockMode();

    if (!baseUrl || !apiKey || mockMode) {
      return this.createMockSession(input);
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/checkout-sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: input.reference,
        amountInCents: Math.round(input.amount * 100),
        currency: input.currency,
        description: input.description,
        customerEmail: input.customerEmail,
        redirectUrl: input.redirectUrl,
      }),
    });

    if (!response.ok) {
      throw new BadRequestException(
        `No se pudo crear la sesion de pago (${response.status})`,
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const reference = this.resolveReference(payload, input.reference);
    const checkoutUrl = this.resolveCheckoutUrl(payload, input.redirectUrl);

    return {
      reference,
      checkoutUrl,
      providerResponse: payload,
    };
  }

  verifyWebhookSignature(
    payload: PaymentWebhookSignaturePayload,
    signatureHeader?: string,
  ): boolean {
    const secret = this.configService.get<string>('PAYMENT_GATEWAY_WEBHOOK_SECRET')?.trim();
    if (!secret) {
      return true;
    }

    if (!signatureHeader) {
      return false;
    }

    const expected = createHmac('sha256', secret)
      .update(this.signaturePayload(payload))
      .digest('hex');

    return this.safeCompare(signatureHeader, expected);
  }

  private createMockSession(
    input: CreatePaymentSessionInput,
  ): CreatePaymentSessionResult {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim();
    const checkoutUrl = frontendUrl
      ? `${frontendUrl.replace(/\/$/, '')}/checkout/payment/${encodeURIComponent(input.reference)}`
      : `https://checkout.local/${encodeURIComponent(input.reference)}`;

    return {
      reference: input.reference,
      checkoutUrl,
      providerResponse: {
        mode: 'mock',
        reference: input.reference,
        checkoutUrl,
      },
    };
  }

  private resolveReference(
    payload: Record<string, unknown>,
    fallback: string,
  ): string {
    const reference = payload.reference;
    if (typeof reference === 'string' && reference.trim().length > 0) {
      return reference;
    }

    return fallback;
  }

  private resolveCheckoutUrl(
    payload: Record<string, unknown>,
    fallback: string,
  ): string {
    const checkoutUrl = payload.checkoutUrl ?? payload.permalink ?? payload.url;
    if (typeof checkoutUrl === 'string' && checkoutUrl.trim().length > 0) {
      return checkoutUrl;
    }

    return fallback;
  }

  private isMockMode(): boolean {
    const mode = this.configService.get<string>('PAYMENT_GATEWAY_MODE')?.trim().toLowerCase();
    return mode === 'mock' || mode === 'sandbox';
  }

  private signaturePayload(payload: PaymentWebhookSignaturePayload): string {
    return [
      payload.gatewayReference ?? '',
      payload.status ?? '',
      payload.amount ?? '',
      payload.currency ?? '',
      payload.transactionId ?? '',
      payload.event ?? '',
      payload.timestamp ?? '',
    ].join('|');
  }

  private safeCompare(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}