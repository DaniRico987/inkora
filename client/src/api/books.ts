import axios from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
});

// ======================== Types ========================

export type BookCondition = 'new' | 'used';

export type BookListItem = {
    id: number;
    coverUrl?: string | null;
    title: string;
    author: string;
    price: number;
    status?: string | null;
    isAvailable: boolean;
};

export type PaginatedBooksResponse = {
    items: BookListItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export type BookImage = {
    id: number;
    url: string;
    displayOrder: number;
};

export type BookCategory = {
    id: number;
    name: string;
    description?: string | null;
};

export type BookDetailItem = {
    id: number;
    title: string;
    author: string;
    publicationYear?: number | null;
    publisher?: string | null;
    isbn?: string | null;
    language?: string | null;
    pageCount?: number | null;
    price: number;
    status?: string | null;
    condition?: string | null;
    isAvailable: boolean;
    description?: string | null;
    coverUrl?: string | null;
    preview?: string | null;
    previewUrl?: string | null;
    images?: BookImage[];
    categories?: BookCategory[];
};

export type GetBooksQueryParams = {
    page?: number;
    limit?: number;
    title?: string;
    author?: string;
    categoryId?: number;
    language?: string;
    condition?: BookCondition;
    minPrice?: number;
    maxPrice?: number;
    year?: number;
    sortBy?: 'price' | 'publicationYear' | 'relevance';
    sortOrder?: 'asc' | 'desc';
};

// ======================== API Functions ========================

/**
 * Obtener listado paginado de libros disponibles
 * @param page - Número de página (por defecto 1)
 * @param limit - Cantidad de libros por página (por defecto 10)
 */
export async function getBooks(page: number = 1, limit: number = 10) {
    const { data } = await api.get<PaginatedBooksResponse>('/books', {
        params: { page, limit },
    });
    return data;
}

/**
 * Buscar libros con filtros avanzados
 * @param query - Parámetros de búsqueda y filtros
 */
export async function searchBooks(query: GetBooksQueryParams) {
    const { data } = await api.get<PaginatedBooksResponse>('/books/search', {
        params: query,
    });
    return data;
}

/**
 * Obtener detalles completos de un libro específico
 * @param bookId - ID del libro
 */
export async function getBookDetail(bookId: number) {
    const { data } = await api.get<BookDetailItem>(`/books/${bookId}`);
    return data;
}
