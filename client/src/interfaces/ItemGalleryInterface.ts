export interface ItemGalleryProps {
    items: Array<{
        id: number;
        cuantity: number;
        synopsis?: string;
        image?: string | null;
        title: string;
        author: string;
        tag: string;
        price: string;
        publicationYear?: number;
        genre?: string;
        status?: string;
        language?: string;
    }>;
    title: string;
}