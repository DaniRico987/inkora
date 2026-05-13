import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BooksService } from './books.service';
import { BookDetailDto } from './dto/book-detail.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { GetBooksQueryDto } from './dto/get-books-query.dto';
import { PaginatedBooksResponseDto } from './dto/paginated-books-response.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UploadBookCoverResponseDto } from './dto/upload-book-cover-response.dto';
import { Express } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Crear libro (admin)',
  })
  @ApiBody({ type: CreateBookDto })
  @ApiResponse({ status: 201, description: 'Libro creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - ISBN ya está registrado',
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({ description: 'No tienes permisos para crear libros' })
  async adminCreate(@Body() dto: CreateBookDto) {
    return this.booksService.adminCreate(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Editar libro existente (admin)',
  })
  @ApiBody({ type: UpdateBookDto })
  @ApiResponse({ status: 200, description: 'Libro actualizado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Libro no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - ISBN ya está registrado',
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para editar libros',
  })
  async adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookDto,
  ) {
    return this.booksService.adminUpdate(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Eliminar libro (admin)',
  })
  @ApiResponse({ status: 200, description: 'Libro eliminado' })
  @ApiResponse({ status: 404, description: 'Libro no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para eliminar libros',
  })
  async adminDelete(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.adminDelete(id);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar libros disponibles con paginación',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página a consultar',
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de libros por página',
    example: 10,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Listado paginado del catálogo general de libros disponibles',
    type: PaginatedBooksResponseDto,
  })
  async findAll(@Query() query: GetBooksQueryDto) {
    return this.booksService.findAll(query);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Buscar libros disponibles con filtros, ordenamiento y paginacion',
    description:
      'Endpoint publico para busqueda avanzada en catalogo. Ejemplos: ' +
      '/api/v1/books/search?title=principito&sortBy=relevance&sortOrder=desc, ' +
      '/api/v1/books/search?categoryId=1&minPrice=10000&maxPrice=50000&page=1&limit=12, ' +
      '/api/v1/books/search?author=Rulfo&language=Espanol&condition=used&sortBy=price&sortOrder=asc',
  })
  @ApiQuery({
    name: 'title',
    required: false,
    type: String,
    example: 'Cien anos',
  })
  @ApiQuery({
    name: 'author',
    required: false,
    type: String,
    example: 'Garcia Marquez',
  })
  @ApiQuery({ name: 'categoryId', required: false, type: Number, example: 1 })
  @ApiQuery({
    name: 'language',
    required: false,
    type: String,
    example: 'Espanol',
  })
  @ApiQuery({
    name: 'condition',
    required: false,
    enum: ['new', 'used'],
    example: 'used',
  })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: 10000 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, example: 50000 })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Ano de publicacion exacto',
    example: 1967,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['price', 'publicationYear', 'relevance'],
    example: 'relevance',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado paginado de busqueda de libros disponibles',
    type: PaginatedBooksResponseDto,
  })
  async search(@Query() query: GetBooksQueryDto) {
    return this.booksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener el detalle completo de un libro',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del libro',
    example: 12,
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle completo del libro',
    type: BookDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Libro no encontrado',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findOne(id);
  }

  @Post(':id/cover')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Subir portada de un libro (admin/root)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del libro',
    example: 12,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Portada subida y asociada correctamente al libro',
    type: UploadBookCoverResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Libro no encontrado',
  })
  @ApiUnauthorizedResponse({
    description: 'Token inválido o ausente',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para subir portadas',
  })
  async uploadCover(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: 400,
        }),
    )
    file: Express.Multer.File,
  ) {
    const fileName = (file.originalname ?? '').toLowerCase();
    const mimeType = (file.mimetype ?? '').toLowerCase();
    const hasAllowedExtension = /\.(jpg|jpeg|png|webp)$/.test(fileName);
    const hasAllowedMime = ['image/jpeg', 'image/png', 'image/webp'].includes(
      mimeType,
    );

    if (
      !(
        hasAllowedMime ||
        (mimeType === 'application/octet-stream' && hasAllowedExtension)
      )
    ) {
      throw new BadRequestException(
        'Solo se permiten imágenes JPG, PNG o WEBP',
      );
    }

    return this.booksService.uploadCover(id, file);
  }
}
