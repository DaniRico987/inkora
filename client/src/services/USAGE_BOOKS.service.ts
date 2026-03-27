/**
 * GUIA DE USO - Servicio de Libros (sin JSX)
 *
 * Este archivo queda en .ts, por lo tanto no debe contener etiquetas JSX.
 * Si quieres ejemplos de componentes React, deben ir en un archivo .tsx.
 */

import {
    getBookDetail,
    getBooks,
    searchBooks,
    type GetBooksQueryParams,
} from '../api/books';

export type BooksPageResult = Awaited<ReturnType<typeof getBooks>>;
export type BookDetailResult = Awaited<ReturnType<typeof getBookDetail>>;

export async function fetchBooksPage(page = 1, limit = 12): Promise<BooksPageResult> {
    return getBooks(page, limit);
}

export async function fetchBooksWithFilters(
    query: GetBooksQueryParams,
): Promise<BooksPageResult> {
    return searchBooks(query);
}

export async function fetchOneBook(bookId: number): Promise<BookDetailResult> {
    return getBookDetail(bookId);
}

// Ejemplo de invocacion directa del servicio desde TypeScript puro.
export async function demoBooksServiceCalls() {
    const list = await fetchBooksPage(1, 12);

    const filtered = await fetchBooksWithFilters({
        title: 'principito',
        sortBy: 'relevance',
        sortOrder: 'desc',
    });

    const firstId = list.items[0]?.id;
    const detail = firstId ? await fetchOneBook(firstId) : null;

    return {
        list,
        filtered,
        detail,
    };
}
