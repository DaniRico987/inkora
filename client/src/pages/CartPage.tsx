import React from 'react';
import { CartView } from '../Components/CartView';

/**
 * CartPage - Página del carrito de compras
 * Solo accesible para clientes autenticados
 */
export const CartPage: React.FC = () => {
  return <CartView />;
};
