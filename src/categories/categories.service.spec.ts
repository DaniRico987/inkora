import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaService: {
    category: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      category: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('maps categories ordered by name', async () => {
    prismaService.category.findMany.mockResolvedValue([
      { categoryId: 2, name: 'Arte' },
      { categoryId: 7, name: 'Historia' },
    ]);

    const result = await service.findAll();

    expect(prismaService.category.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: {
        categoryId: true,
        name: true,
      },
    });
    expect(result).toEqual([
      { id: 2, name: 'Arte' },
      { id: 7, name: 'Historia' },
    ]);
  });
});
