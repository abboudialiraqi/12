import { useEffect, useState, useCallback } from 'react';
import {
  ShoppingCart, Minus, Plus, Truck, Shield,
  Check, ChevronRight, Package, Heart, ZoomIn,
  Sparkles, Clock, ArrowLeft
} from 'lucide-react';
import { supabase, type Product } from '../lib/supabase';
import { useCart } from '../hooks/useCart';
import ProductCard from '../components/ProductCard';

type ProductDetailPageProps = {
  productId: string;
  backLabel?: string;
  onBack: () => void;
  onViewDetail: (product: Product) => void;
};

/* ── Color swatches ── */

// normalize Arabic: remove hamza/madda/shadda/harakat and unify alef variants
function normalizeAr(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')   // harakat + dagger alef
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // أ إ آ ٱ → ا
    .replace(/\u0629/g, '\u0647')             // ة → ه
    .replace(/\u0649/g, '\u064A')             // ى → ي
    .replace(/\s+/g, ' ');
}

const COLOR_ENTRIES: [string, string][] = [
  // Arabic
  ['احمر',     '#ef4444'], ['ازرق',     '#3b82f6'], ['اخضر',    '#22c55e'],
  ['اصفر',     '#eab308'], ['اسود',     '#111827'], ['ابيض',    '#f8fafc'],
  ['رمادي',    '#6b7280'], ['وردي',     '#ec4899'], ['بنفسجي',  '#8b5cf6'],
  ['برتقالي',  '#f97316'], ['بني',      '#92400e'], ['ذهبي',    '#d97706'],
  ['فضي',      '#9ca3af'], ['زيتي',     '#65a30d'], ['سماوي',   '#06b6d4'],
  ['بيج',      '#d4b896'], ['نيلي',     '#4338ca'], ['كحلي',    '#1e3a5f'],
  ['تركوازي',  '#14b8a6'], ['خمري',     '#9f1239'], ['زهري',    '#f472b6'],
  ['نحاسي',    '#b45309'], ['كريمي',    '#fef3c7'], ['اوف وايت','#fafaf0'],
  ['توتي',     '#c026d3'], ['عنابي',    '#9f1239'], ['ليموني',  '#bef264'],
  ['سيلفر',    '#9ca3af'], ['غولدن',    '#d97706'], ['بيبي بلو','#bfdbfe'],
  // English
  ['red',      '#ef4444'], ['blue',     '#3b82f6'], ['green',   '#22c55e'],
  ['black',    '#111827'], ['white',    '#f8fafc'], ['gray',    '#6b7280'],
  ['grey',     '#6b7280'], ['pink',     '#ec4899'], ['yellow',  '#eab308'],
  ['purple',   '#8b5cf6'], ['orange',   '#f97316'], ['brown',   '#92400e'],
  ['gold',     '#d97706'], ['silver',   '#9ca3af'], ['cyan',    '#06b6d4'],
  ['teal',     '#14b8a6'], ['navy',     '#1e3a5f'], ['beige',   '#d4b896'],
  ['maroon',   '#9f1239'], ['olive',    '#65a30d'], ['cream',   '#fef3c7'],
  ['violet',   '#7c3aed'], ['indigo',   '#4338ca'], ['rose',    '#f43f5e'],
  ['sky',      '#0ea5e9'], ['lime',     '#84cc16'], ['amber',   '#f59e0b'],
];

// Pre-compute normalized keys once for performance
const COLOR_ENTRIES_NORM: [string, string][] = COLOR_ENTRIES.map(([k, v]) => [normalizeAr(k), v]);

const SIZE_ORDER = ['XS','S','M','L','XL','XXL','XXXL','صغير','وسط','كبير','خاص'];

function getColor(opt: string): string | null {
  const n = normalizeAr(opt);
  // exact match
  for (const [key, hex] of COLOR_ENTRIES_NORM) {
    if (key === n) return hex;
  }
  // partial: input contains keyword or keyword contains input
  for (const [key, hex] of COLOR_ENTRIES_NORM) {
    if (n.includes(key) || key.includes(n)) return hex;
  }
  return null;
}

function isSizeVariant(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('حجم') || n.includes('مقاس') || n.includes('size') || n.includes('قياس');
}

function isColorVariant(name: string, options: string[]): boolean {
  // detect by name
  const n = name.toLowerCase();
  if (n.includes('لون') || n.includes('color') || n.includes('colour')) return true;
  // detect by options: if more than half of options have a known color → treat as color
  const colorMatches = options.filter(o => getColor(o) !== null).length;
  return colorMatches >= Math.ceil(options.length / 2);
}

/* ── Loading skeleton ── */
function Skeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid lg:grid-cols-2 gap-12 animate-pulse">
        <div>
          <div className="aspect-square bg-gray-100 rounded-3xl mb-3" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="w-16 h-16 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
        <div className="space-y-4 pt-4">
          <div className="h-3 bg-gray-100 rounded-full w-24" />
          <div className="h-8 bg-gray-100 rounded-full w-2/3" />
          <div className="h-3 bg-gray-100 rounded-full w-full" />
          <div className="h-3 bg-gray-100 rounded-full w-3/4" />
          <div className="h-12 bg-gray-100 rounded-2xl w-1/3" />
        </div>
      </div>
    </div>
  );
}

/* ── Image zoom modal ── */
function ZoomModal({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <img src={src} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
    </div>
  );
}

export default function ProductDetailPage({ productId, backLabel = 'رجوع', onBack, onViewDetail }: ProductDetailPageProps) {
  const [product, setProduct]             = useState<Product | null>(null);
  const [relatedProducts, setRelated]     = useState<Product[]>([]);
  const [quantity, setQuantity]           = useState(1);
  const [loading, setLoading]             = useState(true);
  const [addedToCart, setAddedToCart]     = useState(false);

  const [wishlisted, setWishlisted]       = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [optionError, setOptionError]     = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [zoomedImg, setZoomedImg]         = useState<string | null>(null);
  const [imgFading, setImgFading]         = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('products').select('*, categories(*)')
        .eq('id', productId).maybeSingle();
      setProduct(data);
      setSelectedOptions({});
      setSelectedImage(0);
      if (data?.category_id) {
        const { data: rel } = await supabase
          .from('products').select('*, categories(*)')
          .eq('category_id', data.category_id)
          .eq('is_active', true).neq('id', data.id).limit(4);
        setRelated(rel || []);
      }
      setLoading(false);
    })();
  }, [productId]);

  useEffect(() => {
    const fn = () => setStickyVisible(window.scrollY > 440);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const switchImage = useCallback((idx: number) => {
    if (idx === selectedImage) return;
    setImgFading(true);
    setTimeout(() => { setSelectedImage(idx); setImgFading(false); }, 200);
  }, [selectedImage]);

  const variants = product?.variants || [];
  const allOptionsSelected = variants.every(v => selectedOptions[v.name]);

  const handleAddToCart = () => {
    if (!product) return;
    if (variants.length > 0 && !allOptionsSelected) {
      setOptionError(true);
      setTimeout(() => setOptionError(false), 3000);
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addItem(product, variants.length > 0 ? selectedOptions : undefined);
    }
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  if (loading) return <Skeleton />;
  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
      <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-900">المنتج غير موجود</h2>
      <button onClick={onBack} className="mt-4 text-emerald-600 font-medium hover:underline">العودة للتسوق</button>
    </div>
  );

  const hasDiscount = product.compare_price && product.compare_price > product.price;
  const discountPercent = hasDiscount ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100) : 0;
  const savingsAmount   = hasDiscount ? product.compare_price! - product.price : 0;
  const images = product.images?.length ? product.images : (product.image_url ? [product.image_url] : []);

  /* sort size options */
  const sortedVariants = variants.map(v => {
    if (!isSizeVariant(v.name)) return v;
    return {
      ...v,
      options: [...v.options].sort((a, b) => {
        const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      }),
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {zoomedImg && <ZoomModal src={zoomedImg} onClose={() => setZoomedImg(null)} />}

      {/* Back button — prominent on all screen sizes */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 font-medium text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </button>
      </div>

      {/* Breadcrumb (secondary, desktop only) */}
      <nav className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <span className="hover:text-emerald-600 cursor-pointer transition-colors" onClick={onBack}>{backLabel}</span>
        <ChevronRight className="w-3 h-3" />
        {product.categories && (
          <>
            <span className="text-gray-500">{product.categories.name}</span>
            <ChevronRight className="w-3 h-3" />
          </>
        )}
        <span className="text-gray-700 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">

        {/* ════════════ LEFT: Image Gallery ════════════ */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="relative aspect-square bg-gray-50 rounded-3xl overflow-hidden group select-none">
            <img
              src={images[selectedImage] || product.image_url}
              alt={product.name}
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${imgFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            />

            {/* Badges */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
              {hasDiscount && (
                <span className="bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg shadow-red-500/30">
                  خصم {discountPercent}%
                </span>
              )}
              {product.is_featured && (
                <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-amber-400/30">
                  <Sparkles className="w-3 h-3" /> مميز
                </span>
              )}
            </div>

            {/* Out of stock */}
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="bg-white text-gray-900 font-bold px-6 py-2.5 rounded-2xl text-sm">نفذت الكمية</span>
              </div>
            )}

            {/* Last pieces badge */}
            {product.stock > 0 && product.stock <= 5 && (
              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-amber-400/30">
                <Clock className="w-3 h-3" />
                آخر {product.stock} قطع!
              </div>
            )}

            {/* Zoom button */}
            <button
              onClick={() => setZoomedImg(images[selectedImage] || product.image_url)}
              className="absolute bottom-4 right-4 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-all shadow-md opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Floating action buttons */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <FloatBtn
                onClick={() => setWishlisted(v => !v)}
                title={wishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                active={wishlisted}
                activeClass="bg-rose-500 text-white shadow-rose-400/40"
              >
                <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
              </FloatBtn>
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => switchImage(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 hover:scale-105 ${
                    selectedImage === i
                      ? 'border-emerald-500 shadow-md shadow-emerald-200 scale-105'
                      : 'border-transparent hover:border-gray-300 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ════════════ RIGHT: Product Info ════════════ */}
        <div className="space-y-6">

          {/* Category + name */}
          <div>
            {product.categories && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full mb-3">
                {product.categories.name}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">{product.name}</h1>
          </div>

          {/* Price */}
          <div className="bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900 text-price-custom tabular-nums">
                {(product.price * quantity).toLocaleString()}
              </span>
              <span className="text-lg text-gray-400 font-medium">د.ع</span>
              {quantity > 1 && (
                <span className="text-sm text-gray-400 mr-1">({product.price.toLocaleString()} × {quantity})</span>
              )}
            </div>
            {hasDiscount && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-gray-400 line-through">{product.compare_price!.toLocaleString()} د.ع</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg">
                  وفّر {savingsAmount.toLocaleString()} د.ع
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-gray-500 leading-relaxed text-sm border-r-2 border-emerald-200 pr-3">
              {product.description}
            </p>
          )}

          {/* ── VARIANTS ── */}
          {sortedVariants.length > 0 && (
            <div className={`space-y-5 p-5 rounded-2xl border-2 transition-all duration-300 ${optionError ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50/50'}`}>
              {optionError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-100 rounded-xl px-4 py-2.5 text-sm font-medium">
                  <span className="text-base">⚠️</span>
                  يرجى اختيار جميع الخيارات أولاً
                </div>
              )}

              {sortedVariants.map(variant => {
                const isColor = isColorVariant(variant.name, variant.options);
                const isSize  = isSizeVariant(variant.name);
                const selected = selectedOptions[variant.name];

                return (
                  <div key={variant.name}>
                    {/* Label */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-gray-800">{variant.name}</span>
                      {selected && (
                        <span className="text-sm text-gray-600 font-medium flex items-center gap-1.5">
                          {getColor(selected) && (
                            <span
                              className="w-3.5 h-3.5 rounded-full inline-block border border-gray-300 shadow-sm"
                              style={{ background: getColor(selected)! }}
                            />
                          )}
                          {selected}
                        </span>
                      )}
                    </div>

                    {/* Color swatches */}
                    {isColor ? (
                      <div className="flex flex-wrap gap-2.5">
                        {variant.options.map(option => {
                          const hex = getColor(option);
                          const isSelected = selected === option;
                          return (
                            <button
                              key={option}
                              onClick={() => setSelectedOptions(prev => ({ ...prev, [variant.name]: option }))}
                              title={option}
                              className={`relative transition-all duration-200 active:scale-90 ${
                                isSelected ? 'scale-110' : 'hover:scale-110'
                              }`}
                            >
                              {hex ? (
                                <span
                                  className={`block w-9 h-9 rounded-full border-2 transition-all duration-200 ${
                                    isSelected
                                      ? 'border-gray-900 shadow-lg'
                                      : 'border-transparent hover:border-gray-400'
                                  }`}
                                  style={{
                                    background: hex,
                                    boxShadow: isSelected ? `0 0 0 3px white, 0 0 0 5px ${hex}` : undefined,
                                  }}
                                />
                              ) : (
                                <span
                                  className={`flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold border-2 transition-all ${
                                    isSelected
                                      ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                                  }`}
                                >
                                  {option.slice(0, 2)}
                                </span>
                              )}
                              {isSelected && (
                                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <Check className="w-4 h-4 text-white drop-shadow-md" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : isSize ? (
                      /* Size pills */
                      <div className="flex flex-wrap gap-2">
                        {variant.options.map(option => {
                          const isSelected = selected === option;
                          return (
                            <button
                              key={option}
                              onClick={() => setSelectedOptions(prev => ({ ...prev, [variant.name]: option }))}
                              className={`relative min-w-[52px] h-11 px-4 rounded-xl text-sm font-bold border-2 transition-all duration-200 active:scale-95 overflow-hidden ${
                                isSelected
                                  ? 'bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/20'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {isSelected && (
                                <span className="absolute inset-0 bg-gray-900 opacity-10 rounded-xl" />
                              )}
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Generic option pills */
                      <div className="flex flex-wrap gap-2">
                        {variant.options.map(option => {
                          const isSelected = selected === option;
                          return (
                            <button
                              key={option}
                              onClick={() => setSelectedOptions(prev => ({ ...prev, [variant.name]: option }))}
                              className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all duration-200 active:scale-95 ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Stock */}
          <div className="flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full ${product.stock > 5 ? 'bg-emerald-500' : product.stock > 0 ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`} />
            <span className={`text-sm font-medium ${product.stock > 5 ? 'text-emerald-600' : product.stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {product.stock > 5 ? 'متوفر في المخزن' : product.stock > 0 ? `آخر ${product.stock} قطع — اطلب الآن!` : 'نفذت الكمية مؤقتاً'}
            </span>
          </div>

          {/* Quantity + CTA */}
          {product.stock > 0 && (
            <div className="space-y-3">
              {/* Quantity */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">الكمية:</span>
                <div className="flex items-center bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all active:scale-90 disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-gray-900 text-lg tabular-nums select-none">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all active:scale-90 disabled:opacity-40"
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-gray-400">{product.stock} متوفر</span>
              </div>

              {/* Add to cart button */}
              <button
                onClick={handleAddToCart}
                className={`relative w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden active:scale-[0.98] ${
                  addedToCart
                    ? 'bg-emerald-100 text-emerald-700 shadow-inner'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-300/40 hover:shadow-emerald-400/40 hover:-translate-y-0.5'
                }`}
              >
                {/* Ripple bg */}
                {!addedToCart && (
                  <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                )}
                {addedToCart ? (
                  <>
                    <Check className="w-5 h-5" />
                    تمت الإضافة للسلة!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    أضف للسلة — {(product.price * quantity).toLocaleString()} د.ع
                  </>
                )}
              </button>

              {/* Wishlist button */}
              <button
                onClick={() => setWishlisted(v => !v)}
                className={`w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border-2 transition-all duration-200 active:scale-[0.98] ${
                  wishlisted
                    ? 'border-rose-200 bg-rose-50 text-rose-600'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                }`}
              >
                <Heart className={`w-4 h-4 transition-all ${wishlisted ? 'fill-rose-500 text-rose-500 scale-110' : ''}`} />
                {wishlisted ? 'أُضيف للمفضلة' : 'أضف للمفضلة'}
              </button>
            </div>
          )}

          {/* Trust badges + Share */}
          <div className="space-y-2.5 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: Truck,  text: 'توصيل سريع',         sub: '24-48 ساعة',         color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { icon: Shield, text: 'ضمان الجودة',         sub: 'أصلي 100%',          color: 'text-blue-600',    bg: 'bg-blue-50' },
                { icon: Truck,  text: 'ترجيع مع المندوب',   sub: 'بوجود المندوب',      color: 'text-amber-600',   bg: 'bg-amber-50' },
              ].map(({ icon: Icon, text, sub, color, bg }, i) => (
                <div key={i} className="text-center p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group cursor-default">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-xs font-bold text-gray-800 leading-tight">{text}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {product.sku && (
            <p className="text-xs text-gray-400 pt-1">رمز المنتج: <span dir="ltr" className="font-mono bg-gray-50 px-1.5 py-0.5 rounded">{product.sku}</span></p>
          )}
        </div>
      </div>

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <section className="mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gray-100" />
            <h2 className="text-xl font-bold text-gray-900 whitespace-nowrap">منتجات مشابهة</h2>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} onViewDetail={onViewDetail} />
            ))}
          </div>
        </section>
      )}

      {/* ── Sticky bar ── */}
      {product.stock > 0 && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-400 ${
            stickyVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
        >
          <div className="bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-emerald-600 font-bold text-sm">{product.price.toLocaleString()} د.ع</p>
                  {hasDiscount && (
                    <p className="text-gray-400 text-xs line-through">{product.compare_price!.toLocaleString()} د.ع</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleAddToCart}
                className={`shrink-0 h-10 px-6 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  addedToCart
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                }`}
              >
                {addedToCart ? <><Check className="w-4 h-4 inline ml-1" />تمت!</> : 'أضف للسلة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Floating action button ── */
function FloatBtn({
  children, onClick, title, active, activeClass,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 active:scale-90 hover:scale-110 ${
        active
          ? `${activeClass} shadow-md`
          : 'bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-gray-900 shadow-black/10'
      }`}
    >
      {children}
    </button>
  );
}
