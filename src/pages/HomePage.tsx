import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, Sparkles, Star,
  ChevronLeft, ChevronRight, TrendingUp, Zap, Shield, Truck, Headphones, Award
} from 'lucide-react';
import { supabase, type Product, type Category } from '../lib/supabase';
import { useSettings } from '../hooks/useSettings';
import ProductCard from '../components/ProductCard';

type HomePageProps = {
  onNavigate: (page: 'products' | 'product-detail', data?: Record<string, string>) => void;
  onCategorySelect: (slug: string) => void;
  onViewDetail: (product: Product) => void;
  onSaleNavigate: () => void;
};

type PromoBanner = {
  id: string;
  image: string;
  link: string;
  position?: string;
  width?: string;
  height?: string;
};

export default function HomePage({ onNavigate, onCategorySelect, onViewDetail, onSaleNavigate }: HomePageProps) {
  const { get } = useSettings();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts]         = useState<Product[]>([]);
  const [newProducts, setNewProducts]           = useState<Product[]>([]);
  const [categories, setCategories]             = useState<Category[]>([]);
  const [subCategories, setSubCategories]       = useState<Category[]>([]);
  const [activeCatId, setActiveCatId]           = useState<string | null>(null);
  const [subCatRef, setSubCatRef]               = useState<HTMLDivElement | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [currentBanner, setCurrentBanner]       = useState(0);
  const catScrollRef = useState<HTMLDivElement | null>(null);
  const [catRef, setCatRef]                     = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [featuredRes, saleRes, newRes, catRes, subCatRes] = await Promise.all([
        supabase.from('products').select('*, categories(*)').eq('is_featured', true).eq('is_active', true).order('created_at', { ascending: false }).limit(8),
        supabase.from('products').select('*, categories(*)')
          .eq('is_active', true)
          .not('compare_price', 'is', null)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('products').select('*, categories(*)').eq('is_active', true).order('created_at', { ascending: false }).limit(6),
        supabase.from('categories').select('*').is('parent_id', null).order('sort_order'),
        supabase.from('categories').select('*').not('parent_id', 'is', null).order('sort_order'),
      ]);
      setFeaturedProducts(featuredRes.data || []);
      setSaleProducts((saleRes.data || []).filter((p: Product) => p.compare_price && p.compare_price > p.price));
      setNewProducts(newRes.data || []);
      setCategories(catRes.data || []);
      setSubCategories(subCatRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const banners = [
    {
      bg:        get('banner1_bg',        'from-emerald-600 to-teal-700'),
      badge:     get('hero_badge',        'عروض حصرية تصل إلى 30%'),
      title:     get('hero_title',        'كل ما تحتاجه'),
      highlight: get('hero_title_highlight', 'للإبداع والتعلم'),
      desc:      get('hero_description',  'اكتشف مجموعتنا الواسعة من الأدوات المدرسية والمكتبية بأفضل الأسعار.'),
      img:       get('banner1_img',       'https://images.pexels.com/photos/6197983/pexels-photo-6197983.jpeg?w=1200&auto=compress'),
    },
    {
      bg:        get('banner2_bg',        'from-sky-700 to-blue-800'),
      badge:     get('banner2_badge',     'وصل حديثاً'),
      title:     get('banner2_title',     'منتجات جديدة'),
      highlight: get('banner2_highlight', 'كل أسبوع'),
      desc:      get('banner2_desc',      'اكتشف أحدث الإضافات لمجموعتنا من الأقلام والدفاتر وأدوات الرسم.'),
      img:       get('banner2_img',       'https://images.pexels.com/photos/6927041/pexels-photo-6927041.jpeg?w=1200&auto=compress'),
    },
    {
      bg:        get('banner3_bg',        'from-amber-600 to-orange-700'),
      badge:     get('banner3_badge',     'عرض محدود'),
      title:     get('banner3_title',     'خصومات على'),
      highlight: get('banner3_highlight', 'أدوات هندسية'),
      desc:      get('banner3_desc',      'عروض خاصة على مجموعة الأدوات الهندسية. لا تفوّت الفرصة!'),
      img:       get('banner3_img',       'https://images.pexels.com/photos/159751/book-address-book-learning-read-159751.jpeg?w=1200&auto=compress'),
    },
  ];

  // Promo banners from settings
  let promoBanners: PromoBanner[] = [];
  try {
    promoBanners = JSON.parse(get('promo_banners', '[]'));
  } catch {
    promoBanners = [];
  }

  type VideoBanner = { id: string; url: string; poster: string; position: string; title: string };
  let videoBanners: VideoBanner[] = [];
  try {
    videoBanners = JSON.parse(get('video_banners', '[]'));
  } catch {
    videoBanners = [];
  }

  const nextBanner = useCallback(() => setCurrentBanner(p => (p + 1) % banners.length), [banners.length]);
  const prevBanner = useCallback(() => setCurrentBanner(p => (p - 1 + banners.length) % banners.length), [banners.length]);

  useEffect(() => {
    const id = setInterval(nextBanner, 5000);
    return () => clearInterval(id);
  }, [nextBanner]);

  const banner = banners[currentBanner];

  const scrollCats = (dir: 'left' | 'right') => {
    if (!catRef) return;
    catRef.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const scrollSubCats = (dir: 'left' | 'right') => {
    if (!subCatRef) return;
    subCatRef.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const handleCategoryClick = (cat: Category) => {
    const hasChildren = subCategories.some(s => s.parent_id === cat.id);
    if (hasChildren) {
      if (activeCatId === cat.id) {
        // second click → navigate to full category page
        onCategorySelect(cat.slug);
        onNavigate('products');
        setActiveCatId(null);
      } else {
        // first click → show subcategories
        setActiveCatId(cat.id);
      }
    } else {
      onCategorySelect(cat.slug);
      onNavigate('products');
    }
  };

  const activeSubCategories = activeCatId ? subCategories.filter(s => s.parent_id === activeCatId) : [];

  const handlePromoBannerClick = (pb: PromoBanner) => {
    if (!pb.link) return;
    // internal navigation: check if it's a category slug or page
    if (pb.link.startsWith('/')) {
      const path = pb.link.slice(1);
      if (path === 'products' || path === 'cart' || path === 'account') {
        onNavigate(path as any);
      } else {
        // treat as category slug
        onCategorySelect(path);
        onNavigate('products');
      }
    } else {
      onCategorySelect(pb.link);
      onNavigate('products');
    }
  };

  const whyUsItems = [
    { icon: Shield,     color: 'text-emerald-400', title: get('why_us_1_title', 'دفع آمن 100%'),           desc: get('why_us_1_desc', 'جميع المدفوعات محمية') },
    { icon: Truck,      color: 'text-blue-400',    title: get('why_us_2_title', 'توصيل سريع للمحافظات'),   desc: get('why_us_2_desc', 'بغداد 24h | المحافظات 48h') },
    { icon: Headphones, color: 'text-amber-400',   title: get('why_us_3_title', 'دعم على مدار الساعة'),    desc: get('why_us_3_desc', 'واتساب في أي وقت') },
    { icon: Award,      color: 'text-rose-400',    title: get('why_us_4_title', 'منتجات أصلية مضمونة'),    desc: get('why_us_4_desc', 'جودة عالية بأسعار منافسة') },
  ];

  return (
    <div className="overflow-x-hidden">

      {/* ── Hero Slider ── */}
      <section className="relative text-white overflow-hidden" style={{ minHeight: '360px' }}>
        <div className="absolute inset-0">
          {banner.img && (
            <img src={banner.img} alt="" className="w-full h-full object-cover" />
          )}
          <div className={`absolute inset-0 bg-gradient-to-l ${banner.bg} ${banner.img ? 'opacity-75' : 'opacity-100'}`} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-24 relative">
          <div className="max-w-2xl space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium border border-white/30 animate-pulse">
              <Sparkles className="w-4 h-4" />
              {banner.badge}
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold leading-tight drop-shadow-lg">
              {banner.title}
              <br />
              <span className="text-yellow-300">{banner.highlight}</span>
            </h1>
            <p className="text-lg text-white/85 max-w-lg leading-relaxed drop-shadow">{banner.desc}</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('products')}
                className="px-8 py-3.5 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 active:scale-[0.98] transition-all shadow-xl flex items-center gap-2"
              >
                {get('hero_cta_primary', 'تسوق الآن')}
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={onSaleNavigate}
                className="px-8 py-3.5 bg-white/10 backdrop-blur-sm text-white rounded-xl font-medium hover:bg-white/20 active:scale-[0.98] transition-all border border-white/30"
              >
                {get('hero_cta_secondary', 'تصفح العروض')}
              </button>
            </div>
          </div>
        </div>

        {/* Slider controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button onClick={prevBanner} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentBanner(i)}
              className={`transition-all rounded-full ${i === currentBanner ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`}
            />
          ))}
          <button onClick={nextBanner} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
        </div>
      </section>

      {/* ── Category Highlights Carousel ── */}
      {categories.length > 0 && (
        <section className="bg-white border-b border-gray-100 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="relative">
              {/* Scroll buttons */}
              <button
                onClick={() => scrollCats('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => scrollCats('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>

              {/* Scrollable row */}
              <div
                ref={el => setCatRef(el)}
                className="flex gap-5 overflow-x-auto scrollbar-none px-10 scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {categories.map(cat => {
                  const hasChildren = subCategories.some(s => s.parent_id === cat.id);
                  const isActive = activeCatId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat)}
                      title={hasChildren ? 'اضغط مرة للاقسام الفرعية، مرتين للذهاب للقسم' : undefined}
                      className="flex flex-col items-center gap-2.5 group shrink-0"
                    >
                      <div className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all duration-200 shadow-sm group-hover:shadow-md group-hover:scale-105 ${
                        isActive ? 'border-emerald-500 ring-2 ring-emerald-300 ring-offset-1' : 'border-gray-100 group-hover:border-emerald-400'
                      }`}>
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                            <span className="text-2xl font-bold text-emerald-600">{cat.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-xs font-medium transition-colors text-center max-w-[72px] leading-tight ${
                        isActive ? 'text-emerald-600' : 'text-gray-700 group-hover:text-emerald-600'
                      }`}>
                        {cat.name}
                        {hasChildren && <span className="block text-[9px] text-gray-400">اضغط للاقسام</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subcategory row */}
            {activeSubCategories.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="relative">
                  <button
                    onClick={() => scrollSubCats('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white shadow-md rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button
                    onClick={() => scrollSubCats('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white shadow-md rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <div
                    ref={el => setSubCatRef(el)}
                    className="flex gap-4 overflow-x-auto scrollbar-none px-9 scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {activeSubCategories.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => { onCategorySelect(sub.slug); onNavigate('products'); setActiveCatId(null); }}
                        className="flex flex-col items-center gap-2 group shrink-0"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-100 group-hover:border-emerald-400 transition-all duration-200 shadow-sm group-hover:shadow-md group-hover:scale-105">
                          {sub.image_url ? (
                            <img src={sub.image_url} alt={sub.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center">
                              <span className="text-lg font-bold text-emerald-500">{sub.name.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-gray-600 group-hover:text-emerald-600 transition-colors text-center max-w-[60px] leading-tight">
                          {sub.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Promo Banners (top) ── */}
      {promoBanners.filter(pb => !pb.position || pb.position === 'top').length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-wrap gap-3">
            {promoBanners.filter(pb => !pb.position || pb.position === 'top').map(pb => (
              <button
                key={pb.id}
                onClick={() => handlePromoBannerClick(pb)}
                className="relative overflow-hidden rounded-2xl hover:scale-[1.02] transition-transform duration-200 shadow-sm hover:shadow-md"
                style={{
                  width: pb.width || '100%',
                  height: pb.height || undefined,
                  aspectRatio: (!pb.width && !pb.height) ? '3/1' : undefined,
                }}
              >
                <img src={pb.image} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Video Banners (top) ── */}
      {videoBanners.filter(v => v.url && (!v.position || v.position === 'top')).map(v => (
        <section key={v.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="rounded-2xl overflow-hidden shadow-md">
            {v.title && <p className="text-center text-sm font-semibold text-gray-700 py-2 bg-gray-50">{v.title}</p>}
            <video
              src={v.url}
              poster={v.poster || undefined}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="w-full max-h-[480px] object-cover bg-black"
            />
          </div>
        </section>
      ))}

      {/* ── Featured Products ── */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h2 className="text-2xl font-bold text-gray-900">{get('featured_title', 'منتجات مميزة')}</h2>
              </div>
              <p className="text-gray-500 text-sm">{get('featured_subtitle', 'أفضل المنتجات المختارة لكم')}</p>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1 group"
            >
              عرض الكل
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} onViewDetail={onViewDetail} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Promo Banners (middle) ── */}
      {promoBanners.filter(pb => pb.position === 'middle').length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-wrap gap-3">
            {promoBanners.filter(pb => pb.position === 'middle').map(pb => (
              <button
                key={pb.id}
                onClick={() => handlePromoBannerClick(pb)}
                className="relative overflow-hidden rounded-2xl hover:scale-[1.02] transition-transform duration-200 shadow-sm hover:shadow-md"
                style={{
                  width: pb.width || '100%',
                  height: pb.height || undefined,
                  aspectRatio: (!pb.width && !pb.height) ? '2/1' : undefined,
                }}
              >
                <img src={pb.image} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Video Banners (middle) ── */}
      {videoBanners.filter(v => v.url && v.position === 'middle').map(v => (
        <section key={v.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="rounded-2xl overflow-hidden shadow-md">
            {v.title && <p className="text-center text-sm font-semibold text-gray-700 py-2 bg-gray-50">{v.title}</p>}
            <video src={v.url} poster={v.poster || undefined} autoPlay muted loop playsInline controls className="w-full max-h-[480px] object-cover bg-black" />
          </div>
        </section>
      ))}

      {/* ── Sale / Offers ── */}
      {saleProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-red-500 fill-red-500" />
                <h2 className="text-2xl font-bold text-gray-900">{get('sale_title', 'عروض وتخفيضات')}</h2>
              </div>
              <p className="text-gray-500 text-sm">{get('sale_subtitle', 'منتجات بأسعار مخفضة لفترة محدودة')}</p>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-sm text-red-600 font-medium hover:text-red-700 flex items-center gap-1 group"
            >
              عرض الكل
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {saleProducts.map(product => (
              <ProductCard key={product.id} product={product} onViewDetail={onViewDetail} />
            ))}
          </div>
        </section>
      )}

      {/* ── New Arrivals ── */}
      {newProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h2 className="text-2xl font-bold text-gray-900">وصل حديثاً</h2>
              </div>
              <p className="text-gray-500 text-sm">أحدث المنتجات المضافة للمتجر</p>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1 group"
            >
              عرض الكل
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {newProducts.map(product => (
              <ProductCard key={product.id} product={product} onViewDetail={onViewDetail} />
            ))}
          </div>
        </section>
      )}

      {/* ── Promo Banners (bottom) ── */}
      {promoBanners.filter(pb => pb.position === 'bottom').length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4 pb-10">
          <div className="flex flex-wrap gap-3">
            {promoBanners.filter(pb => pb.position === 'bottom').map(pb => (
              <button
                key={pb.id}
                onClick={() => handlePromoBannerClick(pb)}
                className="relative overflow-hidden rounded-2xl hover:scale-[1.02] transition-transform duration-200 shadow-sm hover:shadow-md"
                style={{
                  width: pb.width || '100%',
                  height: pb.height || undefined,
                  aspectRatio: (!pb.width && !pb.height) ? '3/1' : undefined,
                }}
              >
                <img src={pb.image} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Video Banners (bottom) ── */}
      {videoBanners.filter(v => v.url && v.position === 'bottom').map(v => (
        <section key={v.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-4 pb-10">
          <div className="rounded-2xl overflow-hidden shadow-md">
            {v.title && <p className="text-center text-sm font-semibold text-gray-700 py-2 bg-gray-50">{v.title}</p>}
            <video src={v.url} poster={v.poster || undefined} autoPlay muted loop playsInline controls className="w-full max-h-[480px] object-cover bg-black" />
          </div>
        </section>
      ))}

      {/* ── Why Us ── */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">{get('why_us_title', 'لماذا تختار سحاب؟')}</h2>
            <p className="text-gray-400 text-sm">{get('why_us_subtitle', 'نقدم لك تجربة تسوق استثنائية')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyUsItems.map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-3 p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group">
                <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Customer Photos (مشاركات الزبائن) ── */}
      {(() => {
        type CustomerPhoto = { id: string; image: string; username: string; caption: string };
        let photos: CustomerPhoto[] = [];
        try { photos = JSON.parse(get('customer_photos', '[]')); } catch { photos = []; }
        const valid = photos.filter(p => p.image);
        if (valid.length === 0) return null;
        const title = get('customer_photos_title', 'مشاركات الزبائن');
        return (
          <section className="bg-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="text-xl font-bold text-gray-900 text-center mb-6">{title}</h2>
              <div className="overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
                <div className="flex gap-3" style={{ width: 'max-content' }}>
                  {valid.map(photo => (
                    <div
                      key={photo.id}
                      className="relative shrink-0 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-200 group"
                      style={{ width: 180, height: 280 }}
                    >
                      <img
                        src={photo.image}
                        alt={photo.username || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* dark overlay */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
                      {/* username top */}
                      {photo.username && (
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shrink-0">
                            <span className="text-white text-[9px] font-bold">{photo.username.replace('@','').charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-white text-xs font-semibold drop-shadow leading-none">{photo.username}</span>
                        </div>
                      )}
                      {/* caption bottom */}
                      {photo.caption && (
                        <div className="absolute bottom-2.5 right-2.5 left-2.5">
                          <p className="text-white text-xs leading-snug drop-shadow line-clamp-2">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

    </div>
  );
}
