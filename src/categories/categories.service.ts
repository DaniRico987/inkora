import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { CategoryListItemDto } from './dto/category-list-item.dto';

@Injectable()
export class CategoriesService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(): Promise<CategoryListItemDto[]> {
		const categories = await this.prisma.category.findMany({
			orderBy: { name: 'asc' },
			select: {
				categoryId: true,
				name: true,
			},
		});

		return categories.map((category) => ({
			id: category.categoryId,
			name: category.name,
		}));
	}
}
