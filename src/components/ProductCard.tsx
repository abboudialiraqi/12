import { useState } from 'react';
import { ShoppingCart, Eye, Check, Heart, Star } from 'lucide-react';
import type { Product } from '../lib/supabase';
import { useCart } from '../hooks/useCart';
import { useCustomer } from '../hooks/useCustomer';
import { useSettings } from '../hooks/useSettings';
import { supabase } from '../lib/supabase';

type ProductCardProps = {
  product: Product;
  onViewDetail: (product: Product) => void;
};

export default function ProductCard({ product, onViewDetail }: ProductCardProps) {
  const { addItem } = useCart();
  const { customer } = useCustomer();
  const { get } = useSettings();
  const [added, setAdded]           = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [imgLoaded, setImgLoaded]   = useState(false);
  const [activeImage, setActiveImage] = useState(product.image_url);

  const showStockCount = get('show_stock_count', '0') === '1';

  const hasDiscount = product.compare_price && product.compare_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)
    : 0;
  const hasVariants = product.variants && product.variants.length > 0;

  // color variant options from the first color-type variant
  const colorImages: Record<string, string> = (product as any).color_images || {};
  const colorVariant = product.variants?.find(v => {
    const n = v.name.toLowerCase();
    return n.includes('لون') || n.includes('color');
  });

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasVariants) { onViewDetail(product); return; }
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!customer) { onViewDetail(product); return; }
    const newState = !wishlisted;
    setWishlisted(newState);
    if (newState) {
      await supabase.from('customer_favorites').insert({ customer_id: customer.id, product_id: product.id });
    } else {
      await supabase.from('customer_favorites').delete().eq('customer_id', customer.id).eq('product_id', product.id);
    }
  };

  const handleColorClick = (e: React.MouseEvent, colorOption: string) => {
    e.stopPropagation();
    const img = colorImages[colorOption];
    if (img) setActiveImage(img);
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-200/80 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer">

      {/* ── Image ── */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden" onClick={() => onViewDetail(product)}>
        {/* Skeleton */}
        {!imgLoaded && <div className="absolute inset-0 bg-gray-100 animate-pulse" />}

        <img
          src={activeImage || product.image_url}
          alt={product.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-transform duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        />

        {/* Badges */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg shadow-sm shadow-red-400/30">
              -{discountPercent}%
            </span>
          )}
          {product.is_featured && !hasDiscount && (
            <span className="flex items-center gap-0.5 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
              <Star className="w-2.5 h-2.5 fill-white" />
              مميز
            </span>
          )}
          {showStockCount && product.stock > 0 && product.stock <= 5 && (
            <span className="flex items-center gap-0.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
              آخر {product.stock}
            </span>
          )}
        </div>

        {/* Out of stock overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <span className="bg-white text-gray-800 font-bold px-4 py-1.5 rounded-xl text-xs">نفذت الكمية</span>
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          className={`absolute top-2.5 left-2.5 w-8 h-8 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 active:scale-90 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-1 sm:group-hover:translate-y-0 ${
            wishlisted
              ? 'bg-rose-500 text-white shadow-rose-400/40 opacity-100'
              : 'bg-white/90 text-gray-400 hover:text-rose-500 hover:bg-white'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Hover overlay with view detail */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
          <button
            onClick={e => { e.stopPropagation(); onViewDetail(product); }}
            className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-gray-800 text-xs font-bold px-4 py-2 rounded-xl shadow-lg hover:bg-white transition-all transform translate-y-3 group-hover:translate-y-0 duration-200 hover:scale-105 active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
            عرض التفاصيل
          </button>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="p-3.5 space-y-2">
        {product.categories && (
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
            {product.categories.name}
          </span>
        )}

        <h3
          onClick={() => onViewDetail(product)}
          className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 hover:text-emerald-600 transition-colors"
        >
          {product.name}
        </h3>

        {/* Color swatches (if color variant + color_images) */}
        {colorVariant && colorVariant.options.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {colorVariant.options.slice(0, 5).map(opt => {
              const hasImg = !!colorImages[opt];
              return (
                <button
                  key={opt}
                  onClick={e => handleColorClick(e, opt)}
                  title={opt}
                  className={`text-[10px] text-gray-600 border rounded px-1.5 py-0.5 transition-all ${
                    hasImg ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Variants hint (non-color) */}
        {hasVariants && !colorVariant && (
          <div className="flex flex-wrap gap-1">
            {product.variants.slice(0, 2).map(v => (
              <span key={v.name} className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                {v.name}: {v.options.slice(0, 3).join(', ')}{v.options.length > 3 ? '…' : ''}
              </span>
            ))}
          </div>
        )}

        {/* Price + cart */}
        <div className="flex items-end justify-between pt-1 gap-2">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-gray-900 tabular-nums">{product.price.toLocaleString()}</span>
              <span className="text-xs text-gray-400">د.ع</span>
            </div>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through leading-tight block">
                {product.compare_price!.toLocaleString()} د.ع
              </span>
            )}
          </div>

          {product.stock > 0 && (
            <button
              onClick={handleAddToCart}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105 shrink-0 ${
                added
                  ? 'bg-emerald-100 text-emerald-600 shadow-inner'
                  : hasVariants
                  ? 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/60'
              }`}
              title={hasVariants ? 'اختر الخيارات' : 'أضف للسلة'}
            >
              {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
