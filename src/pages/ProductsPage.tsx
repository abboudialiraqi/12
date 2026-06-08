import { useEffect, useState } from 'react';
import { SlidersHorizontal, Grid3x3 as Grid3X3, List, ChevronDown, ChevronLeft, Zap, X } from 'lucide-react';
import { supabase, type Product, type Category } from '../lib/supabase';
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
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]);
  const [showFilters, setShowFilters] = useState(false);

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
            // top-level: include products from this cat and all its children
            const { data: children } = await supabase
              .from('categories')
              .select('id')
              .eq('parent_id', catData.id);
            const ids = [catData.id, ...(children || []).map((c: { id: string }) => c.id)];
            query = query.in('category_id', ids);
          } else {
            query = query.eq('category_id', catData.id);
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

      if (priceRange[0] > 0 || priceRange[1] < 200) {
        filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
      }

      setProducts(filtered);
      setLoading(false);
    }
    fetchProducts();
  }, [selectedCategory, searchQuery, sortBy, priceRange, saleOnly]);

  const currentCategory = categories.find(c => c.slug === selectedCategory);
  const topLevelCats = categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const childrenOf = (pid: string) => categories.filter(c => c.parent_id === pid).sort((a, b) => a.sort_order - b.sort_order);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!selectedCategory || categories.length === 0) return;
    const selected = categories.find(c => c.slug === selectedCategory);
    if (selected?.parent_id) {
      setExpandedCats(prev => new Set([...prev, selected.parent_id!]));
    }
  }, [selectedCategory, categories]);

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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            تصفية
          </button>
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

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-black/50' : 'hidden'} lg:block lg:static lg:bg-transparent`}>
          <div className={`${showFilters ? 'absolute left-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto' : ''} lg:w-56 shrink-0 space-y-6`}>
            {showFilters && (
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <h3 className="font-bold text-gray-900">تصفية المنتجات</h3>
                <button onClick={() => setShowFilters(false)} className="text-gray-500">&times;</button>
              </div>
            )}

            {/* Categories */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">الأقسام</h3>
              <div className="space-y-0.5">
                <button
                  onClick={() => onCategorySelect(null)}
                  className={`block w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                    !selectedCategory ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  جميع الأقسام
                </button>
                {topLevelCats.map(cat => {
                  const kids = childrenOf(cat.id);
                  const isExpanded = expandedCats.has(cat.id);
                  const isActive = selectedCategory === cat.slug;
                  const hasActiveChild = kids.some(k => k.slug === selectedCategory);
                  return (
                    <div key={cat.id}>
                      <div className={`flex items-center rounded-lg transition-colors ${isActive || hasActiveChild ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                        <button
                          onClick={() => onCategorySelect(cat.slug)}
                          className={`flex-1 text-right px-3 py-2 text-sm transition-colors ${
                            isActive ? 'text-emerald-600 font-medium' : hasActiveChild ? 'text-emerald-600 font-medium' : 'text-gray-600'
                          }`}
                        >
                          {cat.name}
                        </button>
                        {kids.length > 0 && (
                          <button
                            onClick={() => toggleExpand(cat.id)}
                            className="p-1.5 ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? '-rotate-90' : ''}`} />
                          </button>
                        )}
                      </div>
                      {kids.length > 0 && isExpanded && (
                        <div className="pr-4 space-y-0.5 py-0.5">
                          {kids.map(child => (
                            <button
                              key={child.id}
                              onClick={() => onCategorySelect(child.slug)}
                              className={`block w-full text-right px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                selectedCategory === child.slug ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                              }`}
                            >
                              {child.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">نطاق السعر</h3>
              <div className="space-y-2">
                {[0, 25, 50, 100, 200].map((max, i) => {
                  const min = i === 0 ? 0 : [0, 25, 50, 100][i];
                  return (
                    <button
                      key={i}
                      onClick={() => setPriceRange([min, max])}
                      className={`block w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        priceRange[0] === min && priceRange[1] === max
                          ? 'bg-emerald-50 text-emerald-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {max === 0 ? 'الكل' : max >= 200 ? `${min}+ د.ع` : `${min} - ${max} د.ع`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
              {[...Array(6)].map((_, i) => (
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
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
              {products.map(product => (
                <ProductCard key={product.id} product={product} onViewDetail={onViewDetail} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
