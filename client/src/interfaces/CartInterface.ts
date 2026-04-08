export interface CartItem {
  cartItemId: number;
  bookId: number;
  title: string;
  author: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  cartId: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItemRowProps {
  item: CartItem;
  onUpdate: (cartItemId: number, quantity: number) => Promise<void>;
  onRemove: (cartItemId: number) => Promise<void>;
  loading?: boolean;
}

export interface CartProps {
  variant?: 'page' | 'modal';
}
