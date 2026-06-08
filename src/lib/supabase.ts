import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: number;
  parent_id: string | null;
  created_at: string;
};

export type ProductVariant = {
  name: string; // مثال: "اللون" أو "الحجم"
  options: string[]; // مثال: ["أحمر", "أزرق", "أخضر"]
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_price: number | null;
  image_url: string;
  images: string[];
  category_id: string;
  sku: string;
  stock: number;
  is_featured: boolean;
  is_active: boolean;
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
  categories?: Category;
};

export type CartItem = {
  product: Product;
  quantity: number;
  selectedOptions?: Record<string, string>; // مثال: { "اللون": "أحمر", "الحجم": "كبير" }
  cartKey?: string; // مفتاح فريد (product.id + options)
};

export type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  city: string;
  notes: string;
  total: number;
  status: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  image_url?: string;
  selected_options?: Record<string, string>;
};
