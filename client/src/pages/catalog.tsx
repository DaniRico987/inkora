import { useEffect, useState } from 'react';
import ItemGallery from '../Components/ItemGallery';
import { getBookDetail, getBooks, type BookDetailItem, type BookListItem } from '../api/books';
import type { ItemGalleryProps } from '../interfaces/ItemGalleryInterface';

function formatPrice(value: number): string {
    return value.toLocaleString('es-CO');
}

function mapTag(status?: string | null): string {
    if (status === 'new') return 'Nuevo';
    if (status === 'used') return 'Usado';
    return 'Catalogo';
}

function mapAvailabilityStatus(isAvailable: boolean, status?: string | null): string {
    if (!isAvailable) return 'No disponible';
    if (status === 'new') return 'Nuevo';
    if (status === 'used') return 'Usado';
    return 'Disponible';
}

function toGalleryItem(base: BookListItem, detail?: BookDetailItem): ItemGalleryProps['items'][number] {
    const status = detail?.status ?? base.status;

    return {
        id: base.id,
        cuantity: base.isAvailable ? 1 : 0,
        image: detail?.coverUrl ?? base.coverUrl ?? null,
        synopsis: detail?.description ?? undefined,
        title: base.title,
        author: base.author,
        tag: mapTag(status),
        price: formatPrice(base.price),
        publicationYear: detail?.publicationYear ?? undefined,
        genre: detail?.categories?.[0]?.name ?? undefined,
        status: mapAvailabilityStatus(base.isAvailable, status),
        language: detail?.language ?? undefined,
    };
}

export const CatalogPage: React.FC = () => {
    const [items, setItems] = useState<ItemGalleryProps['items']>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadCatalog() {
            try {
                setLoading(true);
                setError(null);

                const booksPage = await getBooks(1, 24);

                const mappedItems = await Promise.all(
                    booksPage.items.map(async (book) => {
                        try {
                            const detail = await getBookDetail(book.id);
                            return toGalleryItem(book, detail);
                        } catch {
                            return toGalleryItem(book);
                        }
                    }),
                );

                if (isMounted) {
                    setItems(mappedItems);
                }
            } catch (err) {
                if (isMounted) {
                    const message = err instanceof Error ? err.message : 'Error al cargar el catalogo';
                    setError(message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadCatalog();

        return () => {
            isMounted = false;
        };
    }, []);

    if (loading) {
        return <div className="w-full p-6 text-center">Cargando catalogo...</div>;
    }

    if (error) {
        return <div className="w-full p-6 text-center text-red-600">{error}</div>;
    }

    return (
        <div className="w-full h-auto bg-transparent">
            <ItemGallery items={items} title="Catalogo de libros" />
        </div>
    );
};

export default CatalogPage;