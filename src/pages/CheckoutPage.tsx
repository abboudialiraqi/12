import { useState } from 'react';
import { CreditCard, Truck, CheckCircle, MessageCircle, Banknote, Wallet, Smartphone, Copy, Check, Instagram } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../hooks/useCart';
import { useSettings } from '../hooks/useSettings';

const GOVERNORATES = [
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء',
  'ذي قار', 'ديالى', 'الأنبار', 'كركوك', 'بابل', 'واسط',
  'صلاح الدين', 'القادسية', 'المثنى', 'ميسان', 'دهوك', 'السليمانية',
];

type PaymentMethod = 'cod' | 'zain_cash' | 'super_key';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: typeof Banknote; desc: string }[] = [
  { key: 'cod', label: 'الدفع عند الاستلام', icon: Banknote, desc: 'ادفع عند استلام طلبك' },
  { key: 'zain_cash', label: 'زين كاش', icon: Smartphone, desc: 'تحويل عبر محفظة زين كاش' },
  { key: 'super_key', label: 'سوبر كي', icon: Wallet, desc: 'تحويل عبر محفظة سوبر كي' },
];

type CheckoutPageProps = {
  onNavigate: (page: 'home' | 'cart') => void;
};

export default function CheckoutPage({ onNavigate }: CheckoutPageProps) {
  const { items, totalPrice, clearCart } = useCart();
  const { get } = useSettings();

  const WHATSAPP_NUMBER = get('whatsapp_number', '9647840040066');
  const INSTAGRAM_USERNAME = get('instagram_username', '');
  const ZAIN_CASH_NUMBER = get('zain_cash_number', '07815090999');
  const SUPER_KEY_NUMBER = get('super_key_number', '6478539312');
  const [step, setStep] = useState<'info' | 'confirm' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [instagramSent, setInstagramSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    governorate: 'بغداد',
    address: '',
    notes: '',
    payment_method: 'cod' as PaymentMethod,
  });

  const shipping = form.governorate === 'بغداد' ? parseInt(get('shipping_cost_baghdad', '5000')) : parseInt(get('shipping_cost_other', '6000'));
  const freeShippingThreshold = parseInt(get('free_shipping_threshold', '100000'));
  const isFreeShipping = totalPrice >= freeShippingThreshold;
  const finalShipping = isFreeShipping ? 0 : shipping;
  const grandTotal = totalPrice + finalShipping;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone || !form.address) return;
    setStep('confirm');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendWhatsAppNotification = () => {
    const message = buildOrderMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    setWhatsappSent(true);
  };

  const buildOrderMessage = () => {
    const productsList = items
      .map(item => `- ${item.product.name} x${item.quantity} = ${(item.product.price * item.quantity).toLocaleString()} د.ع`)
      .join('\n');
    const paymentLabel = PAYMENT_METHODS.find(p => p.key === form.payment_method)?.label || form.payment_method;
    return `طلب جديد من سحاب\n\nرقم الطلب: ${orderId.slice(0, 8).toUpperCase()}\n\nالعميل: ${form.customer_name}\nرقم الجوال: ${form.customer_phone}\nالمحافظة: ${form.governorate}\nالعنوان: ${form.address}\nطريقة الدفع: ${paymentLabel}${form.notes ? `\nملاحظات: ${form.notes}` : ''}\n\nالمنتجات:\n${productsList}\n\nالمجموع الفرعي: ${totalPrice.toLocaleString()} د.ع\nالشحن: ${finalShipping === 0 ? 'مجاني' : `${finalShipping.toLocaleString()} د.ع`}\nالإجمالي: ${grandTotal.toLocaleString()} د.ع`;
  };

  const sendInstagramNotification = () => {
    const instagramUrl = `https://ig.me/m/${INSTAGRAM_USERNAME}`;
    window.open(instagramUrl, '_blank');
    setInstagramSent(true);
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_email: form.customer_email,
          address: form.address,
          city: form.governorate,
          notes: form.notes,
          total: grandTotal,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        image_url: item.product.image_url || '',
        selected_options: item.selectedOptions || {},
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      setOrderId(order.id);
      setStep('success');
      clearCart();

      setTimeout(() => {
        sendWhatsAppNotification();
      }, 500);
    } catch (err) {
      console.error('Order placement error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && step !== 'success') {
    onNavigate('cart');
    return null;
  }

  const isOnlinePayment = form.payment_method === 'zain_cash' || form.payment_method === 'super_key';
  const paymentAccountNumber = form.payment_method === 'zain_cash' ? ZAIN_CASH_NUMBER : SUPER_KEY_NUMBER;
  const paymentMethodName = form.payment_method === 'zain_cash' ? 'زين كاش' : 'سوبر كي';

  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">تم تأكيد طلبك!</h2>
        <p className="text-gray-500 mb-2">شكراً لك على طلبك. سنقوم بمعالجته في أقرب وقت.</p>
        <p className="text-sm text-gray-400 mb-6">رقم الطلب: {orderId.slice(0, 8).toUpperCase()}</p>

        {/* Online payment instructions */}
        {isOnlinePayment && (
          <div className="rounded-2xl overflow-hidden mb-6 border border-amber-200">
            {/* Header */}
            <div className="bg-amber-500 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">تعليمات الدفع عبر {paymentMethodName}</h3>
                <p className="text-amber-100 text-xs mt-0.5">أكمل التحويل ثم أرسل إثبات الدفع</p>
              </div>
            </div>

            <div className="bg-amber-50 p-6 space-y-4">
              {/* Amount + Account in two columns */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 text-center border border-amber-100">
                  <p className="text-xs text-gray-500 mb-1">المبلغ المطلوب تحويله</p>
                  <p className="text-3xl font-bold text-emerald-600">{grandTotal.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">دينار عراقي</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center border border-amber-100">
                  <p className="text-xs text-gray-500 mb-1">رقم حساب {paymentMethodName}</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-xl font-bold text-gray-900 tracking-wider font-mono" dir="ltr">{paymentAccountNumber}</span>
                    <button
                      onClick={() => handleCopy(paymentAccountNumber)}
                      className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Code for ZainCash */}
              {form.payment_method === 'zain_cash' && (
                <div className="bg-white rounded-xl p-4 border border-amber-100 flex flex-col items-center gap-3">
                  <p className="text-sm font-medium text-gray-700">امسح الرمز للتحويل مباشرة</p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=zaincash%3A%2F%2Fpay%3Fphone%3D${ZAIN_CASH_NUMBER}%26amount%3D${grandTotal}&bgcolor=ffffff&color=059669&margin=10`}
                    alt="QR Code زين كاش"
                    className="w-44 h-44 rounded-xl"
                  />
                  <p className="text-xs text-gray-400">QR Code زين كاش</p>
                </div>
              )}

              {/* Steps */}
              <div className="space-y-2">
                {[
                  `افتح تطبيق ${paymentMethodName}`,
                  'اختر "تحويل" أو امسح الرمز أعلاه',
                  `أدخل رقم الحساب: ${paymentAccountNumber}`,
                  `أدخل المبلغ: ${grandTotal.toLocaleString()} د.ع`,
                  'أرسل لقطة إثبات الدفع عبر واتساب',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-amber-800">
                    <span className="w-5 h-5 bg-amber-200 text-amber-800 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contact notification buttons */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 space-y-3">
          <p className="text-sm font-medium text-gray-700 text-center">
            {isOnlinePayment ? 'أرسل إثبات الدفع لتأكيد طلبك:' : 'أرسل تفاصيل طلبك عبر:'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={sendWhatsAppNotification}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                whatsappSent
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200/50'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              {isOnlinePayment ? 'إثبات الدفع عبر واتساب' : 'واتساب'}
              {whatsappSent && <Check className="w-3.5 h-3.5" />}
            </button>
            {INSTAGRAM_USERNAME && (
              <button
                onClick={sendInstagramNotification}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  instagramSent
                    ? 'bg-pink-100 text-pink-700 border border-pink-300'
                    : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 shadow-md shadow-pink-200/50'
                }`}
              >
                <Instagram className="w-4 h-4" />
                {isOnlinePayment ? 'إثبات الدفع عبر إنستغرام' : 'إنستغرام'}
                {instagramSent && <Check className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          {!whatsappSent && !instagramSent && !isOnlinePayment && (
            <p className="text-xs text-gray-400 text-center">جاري فتح واتساب لإرسال تفاصيل الطلب...</p>
          )}
        </div>
        <div>
          <button
            onClick={() => onNavigate('home')}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Steps */}
      <div className="flex items-center justify-center gap-4 mb-10">
        {[
          { key: 'info', label: 'معلومات الشحن', icon: Truck },
          { key: 'confirm', label: 'تأكيد الطلب', icon: CreditCard },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step === s.key
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {i + 1}
            </div>
            <span className={`text-sm font-medium ${
              step === s.key ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {s.label}
            </span>
            {i < 1 && <div className="w-12 h-px bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      {step === 'info' && (
        <form onSubmit={handleSubmitInfo} className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">معلومات الشحن</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل *</label>
                <input
                  name="customer_name"
                  value={form.customer_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="محمد أحمد"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الجوال *</label>
                <input
                  name="customer_phone"
                  value={form.customer_phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="07XXXXXXXX"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
              <input
                name="customer_email"
                type="email"
                value={form.customer_email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">المحافظة *</label>
              <select
                name="governorate"
                value={form.governorate}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white appearance-none cursor-pointer"
              >
                {GOVERNORATES.map(gov => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">العنوان *</label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="الحي، الشارع، رقم المبنى"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات</label>
              <input
                name="notes"
                value={form.notes}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="ملاحظات إضافية"
              />
            </div>

            {/* Payment Methods */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">طريقة الدفع *</label>
              <div className="grid sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon;
                  const isSelected = form.payment_method === method.key;
                  return (
                    <button
                      key={method.key}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, payment_method: method.key }))}
                      className={`p-4 rounded-xl border-2 text-right transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <p className={`text-sm font-semibold ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>{method.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{method.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200 mt-4"
            >
              متابعة لتأكيد الطلب
            </button>
          </div>

          {/* Summary */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-2xl p-6 space-y-4 sticky top-24">
              <h3 className="font-bold text-gray-900">ملخص الطلب</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg overflow-hidden shrink-0">
                      <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">الكمية: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>المجموع الفرعي</span>
                  <span>{totalPrice.toLocaleString()} د.ع</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>الشحن ({form.governorate})</span>
                  <span className={finalShipping === 0 ? 'text-emerald-600 font-medium' : ''}>
                    {finalShipping === 0 ? 'مجاني' : `${finalShipping.toLocaleString()} د.ع`}
                  </span>
                </div>
                {!isFreeShipping && (
                  <p className="text-xs text-amber-600">أضف {(freeShippingThreshold - totalPrice).toLocaleString()} د.ع للحصول على شحن مجاني</p>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                  <span>الإجمالي</span>
                  <span className="text-emerald-600">{grandTotal.toLocaleString()} د.ع</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {step === 'confirm' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">تأكيد الطلب</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">الاسم:</span>
                <p className="font-medium text-gray-900">{form.customer_name}</p>
              </div>
              <div>
                <span className="text-gray-500">رقم الجوال:</span>
                <p className="font-medium text-gray-900" dir="ltr">{form.customer_phone}</p>
              </div>
              <div>
                <span className="text-gray-500">المحافظة:</span>
                <p className="font-medium text-gray-900">{form.governorate}</p>
              </div>
              <div>
                <span className="text-gray-500">العنوان:</span>
                <p className="font-medium text-gray-900">{form.address}</p>
              </div>
              <div>
                <span className="text-gray-500">طريقة الدفع:</span>
                <p className="font-medium text-gray-900">{PAYMENT_METHODS.find(p => p.key === form.payment_method)?.label}</p>
              </div>
              {form.notes && (
                <div>
                  <span className="text-gray-500">ملاحظات:</span>
                  <p className="font-medium text-gray-900">{form.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Online payment preview on confirm step */}
          {isOnlinePayment && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              <div className="bg-amber-500 px-5 py-3 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">الدفع عبر {paymentMethodName}</span>
              </div>
              <div className="p-5 grid sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-xl p-3 text-center">
                  <span className="text-xs text-gray-500">المبلغ</span>
                  <p className="font-bold text-emerald-600 text-xl mt-0.5">{grandTotal.toLocaleString()} د.ع</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <span className="text-xs text-gray-500">رقم {paymentMethodName}</span>
                  <p className="font-bold text-gray-900 tracking-wider font-mono mt-0.5" dir="ltr">{paymentAccountNumber}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            <h3 className="font-bold text-gray-900">المنتجات</h3>
            {items.map(item => (
              <div key={item.product.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden">
                    <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-xs text-gray-500">x{item.quantity}</p>
                  </div>
                </div>
                <span className="font-bold text-sm">{(item.product.price * item.quantity).toLocaleString()} د.ع</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي</span>
                <span>{totalPrice.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>الشحن ({form.governorate})</span>
                <span className={finalShipping === 0 ? 'text-emerald-600 font-medium' : ''}>
                  {finalShipping === 0 ? 'مجاني' : `${finalShipping.toLocaleString()} د.ع`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                <span>الإجمالي</span>
                <span className="text-emerald-600">{grandTotal.toLocaleString()} د.ع</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('info')}
              className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              رجوع
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  تأكيد الطلب
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
