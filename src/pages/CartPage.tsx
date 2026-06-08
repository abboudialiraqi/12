import { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Tag, Check, X } from 'lucide-react';
import { useCart } from '../hooks/useCart';

const DISCOUNT_CODES: Record<string, number> = {
  'SAHAB10': 10,
  'BACK2SCHOOL': 15,
  'WELCOME20': 20,
};

type CartPageProps = {
  onNavigate: (page: 'products' | 'checkout') => void;
};

export default function CartPage({ onNavigate }: CartPageProps) {
  const { items, removeItem, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null);
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (DISCOUNT_CODES[code]) {
      setAppliedCoupon({ code, percent: DISCOUNT_CODES[code] });
      setCouponError('');
      setCouponInput('');
    } else {
      setCouponError('كود الخصم غير صحيح');
      setTimeout(() => setCouponError(''), 3000);
    }
  };

  const removeCoupon = () => setAppliedCoupon(null);

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">سلة التسوق فارغة</h2>
        <p className="text-gray-500 mb-6">لم تقم بإضافة أي منتجات بعد</p>
        <button
          onClick={() => onNavigate('products')}
          className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          تسوق الآن
        </button>
      </div>
    );
  }

  const freeShippingThreshold = 100000;
  const isFreeShipping = totalPrice >= freeShippingThreshold;
  const shipping = isFreeShipping ? 0 : 5000;
  const discountAmount = appliedCoupon ? Math.round(totalPrice * appliedCoupon.percent / 100) : 0;
  const grandTotal = totalPrice + shipping - discountAmount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سلة التسوق</h1>
          <p className="text-sm text-gray-500 mt-1">{totalItems} منتج</p>
        </div>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 font-medium hover:text-red-600 transition-colors"
        >
          إفراغ السلة
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div
              key={item.cartKey}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 hover:shadow-md transition-shadow"
            >
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{item.product.name}</h3>
                {item.product.categories && (
                  <span className="text-xs text-emerald-600">{item.product.categories.name}</span>
                )}
                {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(item.selectedOptions).map(([key, value]) => (
                      <span key={key} className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.cartKey!, item.quantity - 1)}
                      className="p-1.5 hover:bg-gray-50 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.cartKey!, item.quantity + 1)}
                      className="p-1.5 hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-600">{(item.product.price * item.quantity).toLocaleString()} د.ع</span>
                    <button
                      onClick={() => removeItem(item.cartKey!)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 sticky top-24">
            <h2 className="font-bold text-gray-900 text-lg">ملخص الطلب</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي</span>
                <span>{totalPrice.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>الشحن</span>
                <span className={shipping === 0 ? 'text-emerald-600 font-medium' : ''}>
                  {shipping === 0 ? 'مجاني' : `${shipping.toLocaleString()} د.ع`}
                </span>
              </div>
              {!isFreeShipping && (
                <p className="text-xs text-amber-600">أضف {(freeShippingThreshold - totalPrice).toLocaleString()} د.ع للحصول على شحن مجاني</p>
              )}
              <p className="text-xs text-gray-400">الشحن داخل بغداد 5,000 د.ع | المحافظات 6,000 د.ع</p>

              {/* Coupon code */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 text-emerald-700 text-sm">
                    <Check className="w-4 h-4" />
                    <span className="font-mono font-bold">{appliedCoupon.code}</span>
                    <span className="text-emerald-600">({appliedCoupon.percent}% خصم)</span>
                  </div>
                  <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="كود الخصم"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      dir="ltr"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim()}
                      className="px-3 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      تطبيق
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium text-sm">
                  <span>الخصم</span>
                  <span>- {discountAmount.toLocaleString()} د.ع</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base">
                <span>الإجمالي</span>
                <span className="text-emerald-600">{grandTotal.toLocaleString()} د.ع</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('checkout')}
              className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200"
            >
              إتمام الطلب
            </button>
            <button
              onClick={() => onNavigate('products')}
              className="w-full py-3 text-gray-600 text-sm font-medium hover:text-emerald-600 transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              متابعة التسوق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
