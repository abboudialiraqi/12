import { useState, useEffect } from 'react';
import { Mail, LogOut, ShoppingBag, Clock, CheckCircle, XCircle, Truck, User, Eye, EyeOff, ChevronRight, Package, Lock, UserPlus, LogIn, Heart, Phone } from 'lucide-react';
import { useCustomer } from '../hooks/useCustomer';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type CustomerAccountPageProps = {
  onNavigate: (page: 'home' | 'products') => void;
  onViewDetail: (product: Product) => void;
};

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_INFO: Record<OrderStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending:   { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700',     icon: Clock },
  confirmed: { label: 'مؤكد',          color: 'bg-blue-100 text-blue-700',       icon: CheckCircle },
  shipped:   { label: 'تم الشحن',      color: 'bg-sky-100 text-sky-700',         icon: Truck },
  delivered: { label: 'تم التسليم',    color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'ملغي',          color: 'bg-red-100 text-red-700',         icon: XCircle },
};

type Order = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  city: string | null;
};

type FavoriteProduct = {
  id: string;
  product_id: string;
  products: Product;
};

const COUNTRY_CODES = [
  { code: '+964', flag: '🇮🇶', name: 'العراق' },
  { code: '+966', flag: '🇸🇦', name: 'السعودية' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن' },
  { code: '+963', flag: '🇸🇾', name: 'سوريا' },
  { code: '+961', flag: '🇱🇧', name: 'لبنان' },
  { code: '+20',  flag: '🇪🇬', name: 'مصر' },
  { code: '+90',  flag: '🇹🇷', name: 'تركيا' },
  { code: '+1',   flag: '🇺🇸', name: 'أمريكا' },
  { code: '+44',  flag: '🇬🇧', name: 'بريطانيا' },
];

type Mode = 'login' | 'register';
type LoginMethod = 'phone' | 'email';
type DashTab = 'orders' | 'favorites';

export default function CustomerAccountPage({ onNavigate, onViewDetail }: CustomerAccountPageProps) {
  const { customer, loading, register, login, signOut } = useCustomer();
  const { signIn: adminSignIn } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [countryCode, setCountryCode] = useState('+964');
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const [dashTab, setDashTab] = useState<DashTab>('orders');

  useEffect(() => {
    if (!loading && customer) {
      fetchOrders(customer.phone);
      fetchFavorites(customer.id);
    }
  }, [customer, loading]);

  const fetchOrders = async (ph: string) => {
    setOrdersLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('id, total, status, created_at, city')
      .eq('customer_phone', ph)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setOrdersLoading(false);
  };

  const fetchFavorites = async (customerId: string) => {
    setFavLoading(true);
    const { data } = await supabase
      .from('customer_favorites')
      .select('id, product_id, products(*, categories(*))')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setFavorites((data as any) || []);
    setFavLoading(false);
  };

  const removeFavorite = async (favoriteId: string) => {
    await supabase.from('customer_favorites').delete().eq('id', favoriteId);
    setFavorites(prev => prev.filter(f => f.id !== favoriteId));
  };

  const handleSubmit = async () => {
    setError('');

    if (loginMethod === 'email') {
      if (!email.trim()) { setError('أدخل البريد الإلكتروني'); return; }
      if (!password) { setError('أدخل كلمة المرور'); return; }
      setSubmitting(true);
      try {
        const { error: signInError } = await adminSignIn(email.trim(), password);
        if (signInError) {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        } else {
          onNavigate('home');
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!phone.trim()) { setError('أدخل رقم الهاتف'); return; }
    if (!password) { setError('أدخل الرمز'); return; }
    if (mode === 'register' && !name.trim()) { setError('أدخل اسمك'); return; }

    setSubmitting(true);
    try {
      const result = mode === 'register'
        ? await register(countryCode, phone.trim(), password, name)
        : await login(countryCode, phone.trim(), password);
      if (result.error) setError(result.error);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (customer) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <User className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.name || 'أهلاً بك'}</h1>
              <p className="text-sm text-gray-500 font-mono" dir="ltr">{customer.country_code} {customer.phone}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            تسجيل خروج
          </button>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
          <button
            onClick={() => setDashTab('orders')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${dashTab === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ShoppingBag className="w-4 h-4" />
            طلباتي ({orders.length})
          </button>
          <button
            onClick={() => setDashTab('favorites')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${dashTab === 'favorites' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Heart className="w-4 h-4" />
            المفضلة ({favorites.length})
          </button>
        </div>

        {dashTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {ordersLoading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">لا توجد طلبات بعد</p>
                <button onClick={() => onNavigate('products')} className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
                  تسوق الآن
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.map(order => {
                  const info = STATUS_INFO[order.status as OrderStatus] || STATUS_INFO.pending;
                  const Icon = info.icon;
                  return (
                    <div key={order.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${info.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 font-mono" dir="ltr">#{order.id.slice(0, 8).toUpperCase()}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${info.color}`}>{info.label}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400">{order.city || '-'}</span>
                          <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('ar-IQ')}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 shrink-0">{Number(order.total).toLocaleString()} د.ع</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {dashTab === 'favorites' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {favLoading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : favorites.length === 0 ? (
              <div className="p-12 text-center">
                <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">لا توجد منتجات مفضلة</p>
                <button onClick={() => onNavigate('products')} className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
                  تصفح المنتجات
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {favorites.map(fav => {
                  const prod = fav.products;
                  if (!prod) return null;
                  return (
                    <div key={fav.id} className="flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                      <button onClick={() => onViewDetail(prod)} className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                        {prod.image_url
                          ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <button onClick={() => onViewDetail(prod)} className="font-medium text-gray-900 text-sm hover:text-emerald-600 transition-colors text-right block truncate">
                          {prod.name}
                        </button>
                        <p className="text-sm font-bold text-emerald-600 mt-0.5">{Number(prod.price).toLocaleString()} د.ع</p>
                      </div>
                      <button onClick={() => removeFavorite(fav.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onNavigate('products')}
          className="mt-6 w-full py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          متابعة التسوق
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">حسابي</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loginMethod === 'email' ? 'دخول بالبريد الإلكتروني' : mode === 'login' ? 'سجل الدخول لمتابعة طلباتك' : 'أنشئ حسابك الجديد'}
          </p>
        </div>

        {/* Login method toggle */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
          <button
            onClick={() => { setLoginMethod('phone'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${loginMethod === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Phone className="w-4 h-4" />
            رقم الهاتف
          </button>
          <button
            onClick={() => { setLoginMethod('email'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${loginMethod === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Mail className="w-4 h-4" />
            البريد الإلكتروني
          </button>
        </div>

        {/* Phone mode toggle */}
        {loginMethod === 'phone' && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LogIn className="w-3.5 h-3.5" />
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${mode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              حساب جديد
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>
          )}

          {/* Email fields */}
          {loginMethod === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="admin@example.com"
                  dir="ltr"
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                />
              </div>
            </div>
          )}

          {/* Phone fields */}
          {loginMethod === 'phone' && (
            <>
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="محمد أحمد"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف</label>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCodeDropdown(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-3 border border-gray-200 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <span className="text-base">{selectedCountry.flag}</span>
                      <span className="text-gray-700 font-mono" dir="ltr">{countryCode}</span>
                      <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showCodeDropdown ? '-rotate-90' : 'rotate-90'}`} />
                    </button>
                    {showCodeDropdown && (
                      <div className="absolute top-full mt-1 right-0 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                        <div className="max-h-60 overflow-y-auto py-1">
                          {COUNTRY_CODES.map(c => (
                            <button key={c.code} type="button" onClick={() => { setCountryCode(c.code); setShowCodeDropdown(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-right ${countryCode === c.code ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'}`}
                            >
                              <span className="text-base">{c.flag}</span>
                              <span className="flex-1">{c.name}</span>
                              <span className="font-mono text-gray-400" dir="ltr">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={countryCode === '+964' ? '07XXXXXXXXX' : 'رقم الهاتف'}
                      dir="ltr"
                      onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {loginMethod === 'email' ? 'كلمة المرور' : mode === 'register' ? 'رمز الحساب (اختر رمزاً سهل تتذكره)' : 'رمز الحساب'}
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pr-10 pl-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="●●●●●●"
                dir="ltr"
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || (loginMethod === 'email' ? (!email || !password) : (!phone || !password || (mode === 'register' && !name)))}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : mode === 'register' && loginMethod === 'phone'
              ? <><UserPlus className="w-4 h-4" />إنشاء الحساب</>
              : <><LogIn className="w-4 h-4" />دخول</>
            }
          </button>
        </div>

        <div className="text-center mt-4">
          <button onClick={() => onNavigate('home')} className="text-sm text-gray-500 hover:text-gray-700">
            العودة للمتجر
          </button>
        </div>
      </div>
    </div>
  );
}
