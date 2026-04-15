import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

describe('PurchasesController', () => {
  let controller: PurchasesController;
  const purchasesService = {
    createPurchase: jest.fn(),
    getPurchaseById: jest.fn(),
    updatePurchaseAddress: jest.fn(),
    updatePurchaseStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchasesController],
      providers: [
        {
          provide: PurchasesService,
          useValue: purchasesService,
        },
      ],
    }).compile();

    controller = module.get<PurchasesController>(PurchasesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar la actualizacion de direccion al servicio', async () => {
    purchasesService.updatePurchaseAddress.mockResolvedValueOnce({
      purchaseId: 15,
      shippingAddress: 'Nueva direccion',
    });

    const result = await controller.updatePurchaseAddress(
      { user: { clientId: 10 } } as any,
      15,
      { shippingAddress: 'Nueva direccion' },
    );

    expect(purchasesService.updatePurchaseAddress).toHaveBeenCalledWith(
      15,
      10,
      'Nueva direccion',
    );
    expect(result).toEqual({
      purchaseId: 15,
      shippingAddress: 'Nueva direccion',
    });
  });

  it('debe rechazar si el usuario no tiene clientId', async () => {
    await expect(
      controller.updatePurchaseAddress(
        { user: { userType: 'client' } } as any,
        15,
        { shippingAddress: 'Nueva direccion' },
      ),
    ).rejects.toThrow('Solo los clientes pueden modificar pedidos');
  });
});
