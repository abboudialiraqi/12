import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Product, CartItem } from '../lib/supabase';

type CartContextType = {
  items: CartItem[];
  addItem: (product: Product, selectedOptions?: Record<string, string>) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | null>(null);

function buildCartKey(productId: string, selectedOptions?: Record<string, string>): string {
  if (!selectedOptions || Object.keys(selectedOptions).length === 0) return productId;
  const sorted = Object.entries(selectedOptions).sort(([a], [b]) => a.localeCompare(b));
  return `${productId}__${sorted.map(([k, v]) => `${k}:${v}`).join('|')}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, selectedOptions?: Record<string, string>) => {
    const cartKey = buildCartKey(product.id, selectedOptions);
    setItems(prev => {
      const existing = prev.find(item => item.cartKey === cartKey);
      if (existing) {
        return prev.map(item =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, selectedOptions, cartKey }];
    });
  }, []);

  const removeItem = useCallback((cartKey: string) => {
    setItems(prev => prev.filter(item => item.cartKey !== cartKey));
  }, []);

  const updateQuantity = useCallback((cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.cartKey !== cartKey));
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.cartKey === cartKey ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
