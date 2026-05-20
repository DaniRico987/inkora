import { Test, TestingModule } from '@nestjs/testing';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

describe('RefundsController', () => {
  let controller: RefundsController;
  const refundsService = {
    createRefundRequest: jest.fn(),
    processRefund: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundsController],
      providers: [
        {
          provide: RefundsService,
          useValue: refundsService,
        },
      ],
    }).compile();

    controller = module.get(RefundsController);
    jest.clearAllMocks();
  });

  it('debe delegar la solicitud de reembolso al servicio', async () => {
    refundsService.createRefundRequest.mockResolvedValueOnce({
      refundId: 12,
      returnId: 9,
      purchaseId: 15,
      amount: 54990,
      refundMethod: null,
      requestDate: new Date('2026-05-20T12:00:00.000Z'),
      status: 'pending',
    });

    const result = await controller.createRefundRequest(
      { user: { clientId: 10 } } as any,
      { returnBookId: 9 } as any,
    );

    expect(refundsService.createRefundRequest).toHaveBeenCalledWith(10, {
      returnBookId: 9,
    });
    expect(result.refundId).toBe(12);
  });

  it('debe delegar el procesado de reembolso al servicio', async () => {
    refundsService.processRefund.mockResolvedValueOnce({
      refundId: 12,
      status: 'processed',
    });

    const result = await controller.processRefund(12);

    expect(refundsService.processRefund).toHaveBeenCalledWith(12);
    expect(result.status).toBe('processed');
  });
});