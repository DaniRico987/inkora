import { Test, TestingModule } from '@nestjs/testing';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';

describe('ReturnsController', () => {
  let controller: ReturnsController;
  const returnsService = {
    createReturnRequest: jest.fn(),
    getPendingReturnRequests: jest.fn(),
    approveReturnRequest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReturnsController],
      providers: [
        {
          provide: ReturnsService,
          useValue: returnsService,
        },
      ],
    }).compile();

    controller = module.get<ReturnsController>(ReturnsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar la solicitud de devolucion al servicio', async () => {
    returnsService.createReturnRequest.mockResolvedValueOnce({
      returnBookId: 3,
      purchaseId: 15,
      clientId: 10,
      reason: 'badCondition',
      additionalDescription: null,
      requestDate: new Date('2026-05-16T18:30:00.000Z'),
      status: 'pending',
      qrCodeUrl: null,
      approvalDate: null,
    });

    const result = await controller.createReturnRequest(
      { user: { clientId: 10 } } as any,
      { purchaseId: 15, reason: 'badCondition' } as any,
    );

    expect(returnsService.createReturnRequest).toHaveBeenCalledWith(10, {
      purchaseId: 15,
      reason: 'badCondition',
    });
    expect(result.returnBookId).toBe(3);
  });

  it('debe rechazar si el usuario no tiene clientId', async () => {
    await expect(
      controller.createReturnRequest(
        { user: { userType: 'client' } } as any,
        { purchaseId: 15, reason: 'badCondition' } as any,
      ),
    ).rejects.toThrow('Solo los clientes pueden solicitar devoluciones');
  });

  it('debe listar solicitudes pendientes para admin', async () => {
    returnsService.getPendingReturnRequests.mockResolvedValueOnce([
      {
        returnBookId: 4,
      },
    ]);

    const result = await controller.getPendingReturnRequests();

    expect(returnsService.getPendingReturnRequests).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('debe delegar aprobacion de devolucion al servicio', async () => {
    returnsService.approveReturnRequest.mockResolvedValueOnce({
      returnBookId: 4,
      status: 'approved',
    });

    const result = await controller.approveReturnRequest(4);

    expect(returnsService.approveReturnRequest).toHaveBeenCalledWith(4);
    expect(result.status).toBe('approved');
  });
});
