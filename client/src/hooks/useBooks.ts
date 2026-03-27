import { useState, useEffect } from 'react';
import {
    getBooks,
    searchBooks,
    getBookDetail,
} from '../api/books';
import type { 
    GetBooksQueryParams,
    PaginatedBooksResponse,
    BookDetailItem,}
    from '../api/books';

// ======================== useBooks Hook ========================

export function useBooks(page: number = 1, limit: number = 10) {
    const [data, setData] = useState<PaginatedBooksResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await getBooks(page, limit);
                setData(response);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Error al cargar libros';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [page, limit]);

    return { data, loading, error };
}

// ======================== useSearchBooks Hook ========================

export function useSearchBooks(query: GetBooksQueryParams) {
    const [data, setData] = useState<PaginatedBooksResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSearchBooks = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await searchBooks(query);
                setData(response);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Error al buscar libros';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchSearchBooks();
    }, [JSON.stringify(query)]);

    return { data, loading, error };
}

// ======================== useBookDetail Hook ========================

export function useBookDetail(bookId: number | null) {
    const [data, setData] = useState<BookDetailItem | null>(null);
    const [loading, setLoading] = useState<boolean>(!!bookId);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!bookId) {
            setData(null);
            setLoading(false);
            return;
        }

        const fetchBookDetail = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await getBookDetail(bookId);
                setData(response);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Error al cargar detalles del libro';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchBookDetail();
    }, [bookId]);

    return { data, loading, error };
}
