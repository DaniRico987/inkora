import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CategoryListItemDto } from './dto/category-list-item.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
	constructor(private readonly categoriesService: CategoriesService) {}

	@Get()
	@ApiOperation({
		summary: 'Listar categorías',
	})
	@ApiResponse({
		status: 200,
		description: 'Listado mínimo de categorías ordenado por nombre',
		type: [CategoryListItemDto],
	})
	async findAll(): Promise<CategoryListItemDto[]> {
		return this.categoriesService.findAll();
	}
}
