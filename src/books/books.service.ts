import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { BookDetailDto } from './dto/book-detail.dto';
import { BookListItemDto } from './dto/book-list-item.dto';
import { GetBooksQueryDto } from './dto/get-books-query.dto';
import { PaginatedBooksResponseDto } from './dto/paginated-books-response.dto';
import { UploadBookCoverResponseDto } from './dto/upload-book-cover-response.dto';
import { S3Service } from '../storage/s3.service';
import { UploadedFile } from '../storage/interfaces/uploaded-file.interface';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async findAll(query: GetBooksQueryDto): Promise<PaginatedBooksResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = {
      isAvailable: true,
    };

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { bookId: 'asc' },
        select: {
          bookId: true,
          coverUrl: true,
          title: true,
          author: true,
          price: true,
          condition: true,
          isAvailable: true,
        },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      items: books.map<BookListItemDto>((book) => ({
        id: book.bookId,
        coverUrl: book.coverUrl,
        title: book.title,
        author: book.author,
        price: Number(book.price),
        status: book.condition,
        isAvailable: book.isAvailable,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<BookDetailDto> {
    const book = await this.prisma.book.findUnique({
      where: { bookId: id },
      include: {
        bookImages: {
          orderBy: { displayOrder: 'asc' },
        },
        bookCategories: {
          include: {
            category: true,
          },
          orderBy: {
            categoryId: 'asc',
          },
        },
      },
    });

    if (!book) {
      throw new NotFoundException('Libro no encontrado');
    }

    return {
      id: book.bookId,
      title: book.title,
      author: book.author,
      publicationYear: book.publicationYear,
      publisher: book.publisher,
      isbn: book.isbn,
      language: book.language,
      pageCount: book.pageCount,
      price: Number(book.price),
      status: book.condition,
      isAvailable: book.isAvailable,
      description: book.description,
      coverUrl: book.coverUrl,
      preview: book.previewUrl,
      images: book.bookImages.map((image) => ({
        id: image.imageId,
        url: image.imageUrl,
        displayOrder: image.displayOrder,
      })),
      categories: book.bookCategories.map((bookCategory) => ({
        id: bookCategory.category.categoryId,
        name: bookCategory.category.name,
        description: bookCategory.category.description,
      })),
    };
  }

  async uploadCover(
    id: number,
    file: UploadedFile,
  ): Promise<UploadBookCoverResponseDto> {
    const book = await this.prisma.book.findUnique({
      where: { bookId: id },
      select: { bookId: true },
    });

    if (!book) {
      throw new NotFoundException('Libro no encontrado');
    }

    const { url } = await this.s3Service.uploadCover(file, id);

    const updatedBook = await this.prisma.book.update({
      where: { bookId: id },
      data: {
        coverUrl: url,
      },
      select: {
        bookId: true,
        coverUrl: true,
      },
    });

    return {
      id: updatedBook.bookId,
      coverUrl: updatedBook.coverUrl ?? url,
    };
  }
}