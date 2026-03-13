import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Post,
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
import { GetBooksQueryDto } from './dto/get-books-query.dto';
import { PaginatedBooksResponseDto } from './dto/paginated-books-response.dto';
import { UploadBookCoverResponseDto } from './dto/upload-book-cover-response.dto';
import { UploadedFile as UploadedFileType } from '../storage/interfaces/uploaded-file.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

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
  @Roles('admin', 'root')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Subir portada de un libro a AWS S3 (admin/root)',
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
    file: UploadedFileType,
  ) {
    const fileName = (file.originalname ?? '').toLowerCase();
    const mimeType = (file.mimetype ?? '').toLowerCase();
    const hasAllowedExtension = /\.(jpg|jpeg|png|webp)$/.test(fileName);
    const hasAllowedMime = ['image/jpeg', 'image/png', 'image/webp'].includes(
      mimeType,
    );

    if (!(hasAllowedMime || (mimeType === 'application/octet-stream' && hasAllowedExtension))) {
      throw new BadRequestException(
        'Solo se permiten imágenes JPG, PNG o WEBP',
      );
    }

    return this.booksService.uploadCover(id, file);
  }
}