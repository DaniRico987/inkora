export interface ItemProps {
    id: number;
    image?: string | null;
    synopsis?: string;
    cuantity: number;
    title: string;
    author: string;
    tag: string;
    price: string;
    publicationYear?: number;
    genre?: string;
    status?: string;
    language?: string;
}