import { useEffect, useState } from 'react';
import { Grid3x3 as Grid3X3, List, ChevronDown, Zap, X } from 'lucide-react';
import { supabase, type Product, type Category } from '../lib/supabase';
import { useSettings } from '../hooks/useSettings';
import ProductCard from '../components/ProductCard';

type ProductsPageProps = {
  selectedCategory: string | null;
  onCategorySelect: (slug: string | null) => void;
  searchQuery: string;
  onViewDetail: (product: Product) => void;
  saleOnly?: boolean;
  onClearSale?: () => void;
};

export default function ProductsPage({ selectedCategory, onCategorySelect, searchQuery, onViewDetail, saleOnly = false, onClearSale }: ProductsPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { get } = useSettings();

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      setCategories(data || []);
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*, categories(*)')
        .eq('is_active', true);

      if (selectedCategory) {
        const { data: catData } = await supabase
          .from('categories')
          .select('id, parent_id')
          .eq('slug', selectedCategory)
          .maybeSingle();

        if (catData) {
          if (!catData.parent_id) {
            const { data: children } = await supabase
              .from('categories')
              .select('id')
              .eq('parent_id', catData.id);
            const ids = [catData.id, ...(children || []).map((c: { id: string }) => c.id)];
            // match primary category OR any of the additional category_ids
            query = query.or(`category_id.in.(${ids.join(',')}),category_ids.ov.{${ids.join(',')}}`);
          } else {
            query = query.or(`category_id.eq.${catData.id},category_ids.ov.{${catData.id}}`);
          }
        }
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      if (sortBy === 'price-low') query = query.order('price', { ascending: true });
      else if (sortBy === 'price-high') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      const { data } = await query;
      let filtered = (data || []) as Product[];

      if (saleOnly) {
        filtered = filtered.filter(p => p.compare_price && p.compare_price > p.price);
      }

      setProducts(filtered);
      setLoading(false);
    }
    fetchProducts();
  }, [selectedCategory, searchQuery, sortBy, saleOnly]);

  const currentCategory = categories.find(c => c.slug === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button onClick={() => onCategorySelect(null)} className="hover:text-emerald-600 transition-colors">الرئيسية</button>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          {searchQuery ? `نتائج البحث: "${searchQuery}"` : currentCategory ? currentCategory.name : 'جميع المنتجات'}
        </span>
      </div>

      {saleOnly && (
        <div className="flex items-center gap-3 mb-5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <Zap className="w-5 h-5 text-red-500 fill-red-400 shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-bold text-red-700">عروض وتخفيضات</span>
            <span className="text-xs text-red-500 mr-2">— منتجات بأسعار مخفضة فقط</span>
          </div>
          <button
            onClick={() => { onClearSale?.(); onCategorySelect(null); }}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            إلغاء الفلتر
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {saleOnly ? 'عروض وتخفيضات' : searchQuery ? `نتائج البحث` : currentCategory ? currentCategory.name : 'جميع المنتجات'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} منتج</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="newest">الأحدث</option>
              <option value="price-low">السعر: من الأقل</option>
              <option value="price-high">السعر: من الأعلى</option>
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-5 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Grid3X3 className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">لا توجد منتجات</h3>
          <p className="text-gray-500 text-sm">جرب البحث بكلمات مختلفة أو تصفح قسم آخر</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${viewMode === 'grid' ? (() => {
          const mobile = get('grid_mobile_cols', '2');
          const desktop = get('grid_desktop_cols', '4');
          const mobileClass = mobile === '1' ? 'grid-cols-1' : 'grid-cols-2';
          const desktopClass = desktop === '3' ? 'lg:grid-cols-3' : desktop === '5' ? 'lg:grid-cols-5' : 'lg:grid-cols-4';
          return `${mobileClass} sm:grid-cols-3 ${desktopClass}`;
        })() : 'grid-cols-1'}`}>
          {products.map(product => (
            <ProductCard key={product.id} product={product} onViewDetail={onViewDetail} />
          ))}
        </div>
      )}
    </div>
  );
}
