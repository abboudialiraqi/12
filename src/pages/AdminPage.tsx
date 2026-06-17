import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Save, Image, Package, Tag, ChevronDown, LayoutGrid as Layout, SaveAll, ShoppingCart, BarChart3, Eye, EyeOff, Clock, CheckCircle, XCircle, Truck, Globe, Star, AlignLeft, Bell, Store, CreditCard as CreditCardIcon, ChevronRight, PlusCircle, Users, Phone, Zap, TrendingDown, Shield, Link, UserCog } from 'lucide-react';
import { supabase, type Product, type Category, type ProductVariant } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';

type Order = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  address: string;
  city: string | null;
  notes: string | null;
  total: number;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  price: number;
  image_url?: string;
  selected_options?: Record<string, string>;
};

const ORDER_STATUSES = [
  { key: 'pending', label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700', icon: Clock },
  { key: 'confirmed', label: 'مؤكد', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  { key: 'shipped', label: 'تم الشحن', color: 'bg-sky-100 text-sky-700', icon: Truck },
  { key: 'delivered', label: 'تم التسليم', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  { key: 'cancelled', label: 'ملغي', color: 'bg-red-100 text-red-700', icon: XCircle },
] as const;

type AdminPageProps = {
  onNavigate: (page: 'home' | 'login') => void;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  compare_price: string;
  image_url: string;
  images: string[];
  color_images: Record<string, string>;
  category_id: string;
  category_ids: string[];
  sku: string;
  stock: string;
  is_featured: boolean;
  is_active: boolean;
  variants: ProductVariant[];
};

const emptyProductForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  compare_price: '',
  image_url: '',
  images: [],
  color_images: {},
  category_id: '',
  category_ids: [],
  sku: '',
  stock: '0',
  is_featured: false,
  is_active: true,
  variants: [],
};

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: string;
  parent_id: string;
  color: string;
};

const emptyCategoryForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  sort_order: '0',
  parent_id: '',
  color: '',
};

type SettingField = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'color' | 'select' | 'range';
  ltr?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};
type SettingSection = { id: string; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; color: string; fields: SettingField[] };

const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'store',
    label: 'هوية المتجر',
    desc: 'الاسم والشعار والوصف العام',
    icon: Store,
    color: 'text-blue-600 bg-blue-50',
    fields: [
      { key: 'store_name', label: 'اسم المتجر', placeholder: 'سحاب' },
      { key: 'store_logo_url', label: 'رابط صورة شعار الموقع (URL)', placeholder: 'https://...', ltr: true },
      { key: 'store_tagline', label: 'الشعار التجاري', placeholder: 'للأدوات المدرسية والمكتبية' },
      { key: 'top_bar_text', label: 'نص الشريط الإعلاني (أعلى الصفحة)', placeholder: 'توصيل مجاني للطلبات فوق 100,000 د.ع' },
    ],
  },
  {
    id: 'hero',
    label: 'الصفحة الرئيسية',
    desc: 'عناوين وأزرار قسم البطل (Hero)',
    icon: Globe,
    color: 'text-emerald-600 bg-emerald-50',
    fields: [
      { key: 'hero_badge', label: 'شارة العرض الصغيرة (الشريحة 1)', placeholder: 'عروض حصرية تصل إلى 30%' },
      { key: 'hero_title', label: 'العنوان الرئيسي (الشريحة 1)', placeholder: 'كل ما تحتاجه' },
      { key: 'hero_title_highlight', label: 'العنوان الملوّن — السطر الثاني (الشريحة 1)', placeholder: 'للإبداع والتعلم' },
      { key: 'hero_description', label: 'الوصف (الشريحة 1)', type: 'textarea', placeholder: 'اكتشف مجموعتنا الواسعة...' },
      { key: 'hero_cta_primary', label: 'نص الزر الرئيسي', placeholder: 'تسوق الآن' },
      { key: 'hero_cta_secondary', label: 'نص الزر الثانوي', placeholder: 'تصفح العروض' },
    ],
  },
  {
    id: 'features',
    label: 'مميزات المتجر',
    desc: 'الأيقونات الأربعة أسفل الـ Hero',
    icon: Star,
    color: 'text-amber-600 bg-amber-50',
    fields: [
      { key: 'feature_1_title', label: 'الميزة الأولى - العنوان', placeholder: 'توصيل سريع' },
      { key: 'feature_1_desc', label: 'الميزة الأولى - الوصف', placeholder: 'خلال 24 ساعة' },
      { key: 'feature_2_title', label: 'الميزة الثانية - العنوان', placeholder: 'ضمان الجودة' },
      { key: 'feature_2_desc', label: 'الميزة الثانية - الوصف', placeholder: 'منتجات أصلية 100%' },
      { key: 'feature_3_title', label: 'الميزة الثالثة - العنوان', placeholder: 'دعم متواصل' },
      { key: 'feature_3_desc', label: 'الميزة الثالثة - الوصف', placeholder: 'خدمة عملاء 24/7' },
      { key: 'feature_4_title', label: 'الميزة الرابعة - العنوان', placeholder: 'عروض يومية' },
      { key: 'feature_4_desc', label: 'الميزة الرابعة - الوصف', placeholder: 'خصومات حصرية' },
    ],
  },
  {
    id: 'sections',
    label: 'عناوين الأقسام',
    desc: 'عناوين جداول الأقسام والمنتجات المميزة والعروض',
    icon: AlignLeft,
    color: 'text-teal-600 bg-teal-50',
    fields: [
      { key: 'categories_title',    label: 'عنوان قسم الأقسام',           placeholder: 'تسوق حسب القسم' },
      { key: 'categories_subtitle', label: 'وصف قسم الأقسام',             placeholder: 'اختر القسم المناسب لك' },
      { key: 'featured_title',      label: 'عنوان المنتجات المميزة',       placeholder: 'منتجات مميزة' },
      { key: 'featured_subtitle',   label: 'وصف المنتجات المميزة',        placeholder: 'أفضل المنتجات المختارة لكم' },
      { key: 'sale_title',          label: 'عنوان قسم العروض والتخفيضات', placeholder: 'عروض وتخفيضات' },
      { key: 'sale_subtitle',       label: 'وصف قسم العروض',              placeholder: 'منتجات بأسعار مخفضة لفترة محدودة' },
    ],
  },
  {
    id: 'banners',
    label: 'البانرات الإعلانية',
    desc: 'ألوان التدرج وصور وارتفاع الشرائح الثلاثة',
    icon: Globe,
    color: 'text-sky-600 bg-sky-50',
    fields: [
      { key: 'hero_min_height_mobile',  label: 'ارتفاع البنر — موبايل (px)', type: 'range', min: 180, max: 700, step: 10, unit: 'px', placeholder: '320', ltr: true },
      { key: 'hero_min_height_desktop', label: 'ارتفاع البنر — حاسوب (px)',  type: 'range', min: 300, max: 900, step: 10, unit: 'px', placeholder: '500', ltr: true },
      { key: 'banner1_color_from', label: 'الشريحة 1 — لون التدرج (البداية)', type: 'color', placeholder: '#059669' },
      { key: 'banner1_color_to',   label: 'الشريحة 1 — لون التدرج (النهاية)', type: 'color', placeholder: '#0f766e' },
      { key: 'banner1_img', label: 'الشريحة 1 — صورة الخلفية (رابط URL)', placeholder: 'https://images.pexels.com/...', ltr: true },
      { key: 'banner2_color_from', label: 'الشريحة 2 — لون التدرج (البداية)', type: 'color', placeholder: '#0369a1' },
      { key: 'banner2_color_to',   label: 'الشريحة 2 — لون التدرج (النهاية)', type: 'color', placeholder: '#1e40af' },
      { key: 'banner2_img',        label: 'الشريحة 2 — صورة الخلفية (رابط URL)', placeholder: 'https://images.pexels.com/...', ltr: true },
      { key: 'banner2_badge',      label: 'الشريحة 2 — الشارة الصغيرة',  placeholder: 'وصل حديثاً' },
      { key: 'banner2_title',      label: 'الشريحة 2 — العنوان',          placeholder: 'منتجات جديدة' },
      { key: 'banner2_highlight',  label: 'الشريحة 2 — النص الملوّن',    placeholder: 'كل أسبوع' },
      { key: 'banner2_desc',       label: 'الشريحة 2 — الوصف',           placeholder: 'اكتشف أحدث الإضافات...', type: 'textarea' },
      { key: 'banner3_color_from', label: 'الشريحة 3 — لون التدرج (البداية)', type: 'color', placeholder: '#d97706' },
      { key: 'banner3_color_to',   label: 'الشريحة 3 — لون التدرج (النهاية)', type: 'color', placeholder: '#c2410c' },
      { key: 'banner3_img',        label: 'الشريحة 3 — صورة الخلفية (رابط URL)', placeholder: 'https://images.pexels.com/...', ltr: true },
      { key: 'banner3_badge',      label: 'الشريحة 3 — الشارة الصغيرة',  placeholder: 'عرض محدود' },
      { key: 'banner3_title',      label: 'الشريحة 3 — العنوان',          placeholder: 'خصومات على' },
      { key: 'banner3_highlight',  label: 'الشريحة 3 — النص الملوّن',    placeholder: 'أدوات هندسية' },
      { key: 'banner3_desc',       label: 'الشريحة 3 — الوصف',           placeholder: 'عروض خاصة على مجموعة...', type: 'textarea' },
    ],
  },
  {
    id: 'footer',
    label: 'التذييل والتواصل',
    desc: 'معلومات الاتصال في أسفل الموقع',
    icon: Bell,
    color: 'text-gray-600 bg-gray-100',
    fields: [
      { key: 'footer_brand_description', label: 'وصف المتجر (التذييل)', type: 'textarea', placeholder: 'متجرك المفضل للأدوات...' },
      { key: 'footer_phone',   label: 'رقم الهاتف',           placeholder: '07XXXXXXXX',       ltr: true },
      { key: 'footer_email',   label: 'البريد الإلكتروني',    placeholder: 'info@example.com', ltr: true },
      { key: 'footer_address', label: 'العنوان',               placeholder: 'بغداد، العراق' },
      { key: 'social_facebook',  label: 'رابط فيسبوك',         placeholder: 'https://facebook.com/...', ltr: true },
      { key: 'social_instagram', label: 'رابط إنستغرام',       placeholder: 'https://instagram.com/...', ltr: true },
      { key: 'social_tiktok',    label: 'رابط تيك توك',        placeholder: 'https://tiktok.com/...', ltr: true },
    ],
  },
  {
    id: 'payments',
    label: 'الدفع والشحن',
    desc: 'أرقام الدفع وتكاليف التوصيل',
    icon: CreditCardIcon,
    color: 'text-rose-600 bg-rose-50',
    fields: [
      { key: 'whatsapp_number',         label: 'رقم واتساب (مع رمز الدولة، بدون +)', placeholder: '9647XXXXXXXXX', ltr: true },
      { key: 'instagram_username',      label: 'معرف إنستغرام (بدون @)',              placeholder: 'suhab.iq',     ltr: true },
      { key: 'zain_cash_number',        label: 'رقم زين كاش',                        placeholder: '07XXXXXXXXX',   ltr: true },
      { key: 'super_key_number',        label: 'رقم سوبر كي',                        placeholder: '07XXXXXXXXX',   ltr: true },
      { key: 'free_shipping_threshold', label: 'الحد الأدنى للشحن المجاني (د.ع)',   placeholder: '100000',        ltr: true },
      { key: 'shipping_cost_baghdad',   label: 'تكلفة الشحن داخل بغداد (د.ع)',      placeholder: '5000',          ltr: true },
      { key: 'shipping_cost_other',     label: 'تكلفة الشحن للمحافظات (د.ع)',       placeholder: '6000',          ltr: true },
    ],
  },
  {
    id: 'font_sizes',
    label: 'أحجام الخطوط',
    desc: 'تحكم بحجم كل خانة نص في الموقع (px)',
    icon: Star,
    color: 'text-cyan-600 bg-cyan-50',
    fields: [
      { key: 'fs_hero_title',          label: 'عنوان البنر الرئيسي الكبير',                 type: 'range', min: 18, max: 90, step: 1, unit: 'px', placeholder: '60' },
      { key: 'fs_hero_desc',           label: 'وصف البنر (النص تحت العنوان)',               type: 'range', min: 12, max: 32, step: 1, unit: 'px', placeholder: '18' },
      { key: 'fs_section_heading',     label: 'عناوين الأقسام (مميزة، عروض، لماذا سحاب)', type: 'range', min: 14, max: 56, step: 1, unit: 'px', placeholder: '24' },
      { key: 'fs_section_desc',        label: 'وصف الأقسام (النص الصغير تحت العنوان)',     type: 'range', min: 10, max: 24, step: 1, unit: 'px', placeholder: '14' },
      { key: 'fs_category_label',      label: 'اسم الفئة (تحت دوائر الأقسام)',             type: 'range', min: 10, max: 20, step: 1, unit: 'px', placeholder: '12' },
      { key: 'fs_product_card_name',   label: 'اسم المنتج في البطاقة',                     type: 'range', min: 10, max: 24, step: 1, unit: 'px', placeholder: '14' },
      { key: 'fs_product_card_price',  label: 'سعر المنتج في البطاقة',                     type: 'range', min: 10, max: 28, step: 1, unit: 'px', placeholder: '16' },
      { key: 'fs_product_detail_title', label: 'اسم المنتج في صفحة التفاصيل',              type: 'range', min: 16, max: 52, step: 1, unit: 'px', placeholder: '28' },
      { key: 'fs_product_detail_price', label: 'سعر المنتج في صفحة التفاصيل',              type: 'range', min: 16, max: 64, step: 1, unit: 'px', placeholder: '36' },
      { key: 'fs_nav_link',            label: 'روابط التنقل في الهيدر',                    type: 'range', min: 10, max: 22, step: 1, unit: 'px', placeholder: '14' },
      { key: 'fs_footer_text',         label: 'نصوص الفوتر (التذييل)',                     type: 'range', min: 10, max: 22, step: 1, unit: 'px', placeholder: '14' },
      { key: 'fs_button',              label: 'نصوص الأزرار',                              type: 'range', min: 10, max: 22, step: 1, unit: 'px', placeholder: '14' },
    ],
  },
  {
    id: 'text_colors',
    label: 'ألوان النصوص',
    desc: 'تحكم بلون كل نوع نص في الموقع',
    icon: Star,
    color: 'text-rose-600 bg-rose-50',
    fields: [
      { key: 'color_text_heading',   label: 'لون العناوين الرئيسية (أسماء المنتجات، العناوين الكبيرة)', type: 'color' },
      { key: 'color_text_body',      label: 'لون نصوص المحتوى (الأوصاف، النصوص المتوسطة)',            type: 'color' },
      { key: 'color_text_secondary', label: 'لون النصوص الفرعية (التفاصيل الصغيرة)',                  type: 'color' },
      { key: 'color_text_muted',     label: 'لون النصوص الخافتة (التواريخ، المساعدة)',                type: 'color' },
      { key: 'color_text_price',     label: 'لون الأسعار',                                            type: 'color' },
      { key: 'color_page_bg',        label: 'لون خلفية الصفحة',                                       type: 'color' },
      { key: 'color_nav_bg',         label: 'لون خلفية شريط التنقل (النافبار)',                        type: 'color' },
      { key: 'color_card_bg',        label: 'لون خلفية البطاقات والنوافذ البيضاء',                     type: 'color' },
    ],
  },
  {
    id: 'appearance',
    label: 'اللون الرئيسي والخطوط',
    desc: 'تخصيص اللون الرئيسي وخطوط وأحجام الموقع',
    icon: Star,
    color: 'text-violet-600 bg-violet-50',
    fields: [
      { key: 'site_primary_color', label: 'اللون الرئيسي للموقع (الأزرار والروابط)', type: 'color', placeholder: '#10b981', ltr: true },
      {
        key: 'site_font_family',
        label: 'نوع الخط',
        type: 'select',
        options: [
          { value: 'Tajawal',     label: 'تجوال (افتراضي)' },
          { value: 'Cairo',       label: 'القاهرة' },
          { value: 'Noto Naskh Arabic', label: 'نوتو نسخ' },
          { value: 'Amiri',       label: 'أميري (خط كلاسيكي)' },
          { value: 'Changa',      label: 'تشانجا (عصري)' },
          { value: 'Almarai',     label: 'المرعي' },
          { value: 'El Messiri',  label: 'المسيري' },
          { value: 'Lateef',      label: 'لطيف' },
          { value: 'Mada',        label: 'مدى' },
          { value: 'Reem Kufi',   label: 'ريم كوفي' },
        ],
      },
      {
        key: 'site_font_size',
        label: 'حجم الخط',
        type: 'select',
        options: [
          { value: 'small',  label: 'صغير' },
          { value: 'medium', label: 'متوسط (افتراضي)' },
          { value: 'large',  label: 'كبير' },
        ],
      },
      { key: 'site_announcement',        label: 'نص الشريط الإعلاني أعلى الموقع',      placeholder: 'توصيل مجاني للطلبات فوق 100,000 د.ع' },
      { key: 'site_announcement_active', label: 'تفعيل الشريط الإعلاني (1=نعم / 0=لا)', placeholder: '1', ltr: true },
      { key: 'hero_stats_products',      label: 'إحصائية: عدد المنتجات',               placeholder: '500+',  ltr: true },
      { key: 'hero_stats_customers',     label: 'إحصائية: عدد العملاء',                placeholder: '10K+',  ltr: true },
      { key: 'hero_stats_discount',      label: 'إحصائية: أقصى خصم',                  placeholder: '30%',   ltr: true },
      { key: 'hero_stats_delivery',      label: 'إحصائية: مدة التوصيل',               placeholder: '24h',   ltr: true },
      { key: 'show_stock_count',         label: 'عرض عدد المخزون للزبون (1=نعم / 0=لا)', placeholder: '0', ltr: true },
    ],
  },
  {
    id: 'responsive',
    label: 'القياسات والشبكة',
    desc: 'التحكم بقياسات العناصر على الموبايل والحاسوب',
    icon: Star,
    color: 'text-teal-600 bg-teal-50',
    fields: [
      {
        key: 'grid_mobile_cols',
        label: 'عدد أعمدة المنتجات — موبايل',
        type: 'select',
        options: [{ value: '1', label: 'عمود واحد' }, { value: '2', label: 'عمودان (افتراضي)' }],
      },
      {
        key: 'grid_desktop_cols',
        label: 'عدد أعمدة المنتجات — حاسوب',
        type: 'select',
        options: [{ value: '3', label: '3 أعمدة' }, { value: '4', label: '4 أعمدة (افتراضي)' }, { value: '5', label: '5 أعمدة' }],
      },
      { key: 'hero_min_height_mobile',  label: 'ارتفاع البنر الرئيسي — موبايل (px)', placeholder: '320', ltr: true, type: 'range', min: 200, max: 700, step: 10, unit: 'px' },
      { key: 'hero_min_height_desktop', label: 'ارتفاع البنر الرئيسي — حاسوب (px)', placeholder: '500', ltr: true, type: 'range', min: 300, max: 900, step: 10, unit: 'px' },
      { key: 'card_mobile_w',      label: 'عرض بطاقة مشاركات الزبائن - موبايل (px)', placeholder: '140', ltr: true },
      { key: 'card_mobile_h',      label: 'ارتفاع بطاقة مشاركات الزبائن - موبايل (px)', placeholder: '220', ltr: true },
      { key: 'card_desktop_w',     label: 'عرض بطاقة مشاركات الزبائن - حاسوب (px)', placeholder: '180', ltr: true },
      { key: 'card_desktop_h',     label: 'ارتفاع بطاقة مشاركات الزبائن - حاسوب (px)', placeholder: '280', ltr: true },
    ],
  },
  {
    id: 'why_us',
    label: 'لماذا نختار سحاب',
    desc: 'تعديل عنوان وبطاقات قسم "لماذا نختار"',
    icon: Shield,
    color: 'text-emerald-600 bg-emerald-50',
    fields: [
      { key: 'why_us_title',    label: 'عنوان القسم',    placeholder: 'لماذا تختار سحاب؟' },
      { key: 'why_us_subtitle', label: 'وصف القسم',      placeholder: 'نقدم لك تجربة تسوق استثنائية' },
      { key: 'why_us_1_title', label: 'البطاقة الأولى — العنوان',   placeholder: 'دفع آمن 100%' },
      { key: 'why_us_1_desc',  label: 'البطاقة الأولى — الوصف',    placeholder: 'جميع المدفوعات محمية' },
      { key: 'why_us_2_title', label: 'البطاقة الثانية — العنوان',  placeholder: 'توصيل سريع للمحافظات' },
      { key: 'why_us_2_desc',  label: 'البطاقة الثانية — الوصف',   placeholder: 'بغداد 24h | المحافظات 48h' },
      { key: 'why_us_3_title', label: 'البطاقة الثالثة — العنوان', placeholder: 'دعم على مدار الساعة' },
      { key: 'why_us_3_desc',  label: 'البطاقة الثالثة — الوصف',  placeholder: 'واتساب في أي وقت' },
      { key: 'why_us_4_title', label: 'البطاقة الرابعة — العنوان', placeholder: 'منتجات أصلية مضمونة' },
      { key: 'why_us_4_desc',  label: 'البطاقة الرابعة — الوصف',  placeholder: 'جودة عالية بأسعار منافسة' },
    ],
  },
  {
    id: 'reviews',
    label: 'آراء الزبائن',
    desc: 'منشورات إنستغرام لآراء الزبائن',
    icon: Star,
    color: 'text-pink-600 bg-pink-50',
    fields: [
      { key: 'reviews_title',          label: 'عنوان قسم الآراء',                 placeholder: 'ماذا يقول زبائننا؟' },
      { key: 'reviews_subtitle',       label: 'وصف قسم الآراء',                   placeholder: 'آراء حقيقية من زبائن سعداء' },
      { key: 'reviews_instagram_user', label: 'اسم حساب الإنستغرام (للعرض)',      placeholder: '@suhab.iq' },
    ],
  },
  {
    id: 'promo_banners',
    label: 'بنرات إعلانية',
    desc: 'إضافة وتعديل صور البنرات الإعلانية',
    icon: Link,
    color: 'text-rose-600 bg-rose-50',
    fields: [],
  },
  {
    id: 'video_banners',
    label: 'فيديوهات البنر',
    desc: 'إضافة فيديوهات تُعرض في الصفحة الرئيسية',
    icon: Star,
    color: 'text-purple-600 bg-purple-50',
    fields: [],
  },
  {
    id: 'customer_photos',
    label: 'مشاركات الزبائن',
    desc: 'صور الزبائن المعروضة في الصفحة الرئيسية',
    icon: Star,
    color: 'text-pink-600 bg-pink-50',
    fields: [
      { key: 'customer_photos_title',    label: 'عنوان القسم',                                             placeholder: 'مشاركات الزبائن' },
      { key: 'customer_photos_position', label: 'موضع القسم في الصفحة',                                   placeholder: 'before_why_us', ltr: true },
      { key: 'customer_photos_card_w',   label: 'عرض البطاقة (px) — مثال: 180',                          placeholder: '180', ltr: true },
      { key: 'customer_photos_card_h',   label: 'ارتفاع البطاقة (px) — مثال: 280',                       placeholder: '280', ltr: true },
    ],
  },
];

export default function AdminPage({ onNavigate }: AdminPageProps) {
  const { isAdmin, loading: authLoading } = useAuth();
  const { settings, refresh: refreshSettings } = useSettings();
  const [tab, setTab] = useState<'dashboard' | 'products' | 'sale' | 'categories' | 'orders' | 'customers' | 'cms' | 'admins'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [activeSettingSection, setActiveSettingSection] = useState<string>('store');
  const [promoBanners, setPromoBanners] = useState<{ id: string; image: string; link: string; position: string; width: string; height: string }[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<{ id: string; url: string }[]>([]);
  const [videoBanners, setVideoBanners] = useState<{ id: string; url: string; poster: string; position: string; title: string; maxHeight: string; width: string }[]>([]);
  const [customerPhotos, setCustomerPhotos] = useState<{ id: string; image: string; username: string; caption: string }[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<{ id: string; phone: string; name: string; created_at: string; orderCount?: number }[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [admins, setAdmins] = useState<{ id: string; user_id: string; email: string; created_at: string }[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');

  const fetchData = useCallback(async () => {
    const [productsRes, categoriesRes, ordersRes] = await Promise.all([
      supabase.from('products').select('*, categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
    ]);
    setProducts(productsRes.data || []);
    setCategories(categoriesRes.data || []);
    setOrders(ordersRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (tab === 'cms' && Object.keys(settings).length > 0) {
      setSettingsForm({ ...settings });
      try {
        const parsed = JSON.parse(settings['promo_banners'] || '[]');
        setPromoBanners(parsed);
      } catch {
        setPromoBanners([]);
      }
      try {
        const parsed = JSON.parse(settings['instagram_posts'] || '[]');
        setInstagramPosts(parsed);
      } catch {
        setInstagramPosts([]);
      }
      try {
        const parsed = JSON.parse(settings['video_banners'] || '[]');
        setVideoBanners(parsed);
      } catch {
        setVideoBanners([]);
      }
      try {
        const parsed = JSON.parse(settings['customer_photos'] || '[]');
        setCustomerPhotos(parsed);
      } catch {
        setCustomerPhotos([]);
      }
    }
    if (tab === 'customers') fetchCustomers();
    if (tab === 'admins') fetchAdmins();
  }, [tab, settings]);

  const fetchCustomers = async () => {
    setCustomersLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      // نحسب عدد الطلبات لكل زبون
      const withCounts = await Promise.all(data.map(async c => {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('customer_phone', c.phone);
        return { ...c, orderCount: count || 0 };
      }));
      setCustomers(withCounts);
    }
    setCustomersLoading(false);
  };

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    const { data } = await supabase.from('admins').select('*').order('created_at', { ascending: false });
    setAdmins(data || []);
    setAdminsLoading(false);
  };

  const handleAddAdmin = async () => {
    setAdminError('');
    if (!newAdminEmail.trim() || !newAdminPassword.trim()) {
      setAdminError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setAddingAdmin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: newAdminEmail.trim(), password: newAdminPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل إنشاء المستخدم');
      if (json.user) {
        await supabase.from('admins').insert({
          user_id: json.user.id,
          email: newAdminEmail.trim(),
        });
        setNewAdminEmail('');
        setNewAdminPassword('');
        await fetchAdmins();
      }
    } catch (err: any) {
      setAdminError(err.message || 'حدث خطأ أثناء إضافة الأدمن');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string, userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الأدمن؟')) return;
    try {
      await supabase.from('admins').delete().eq('id', adminId);
      await supabase.auth.admin.deleteUser(userId);
      await fetchAdmins();
    } catch (err) {
      console.error('Delete admin error:', err);
    }
  };

  const handleViewCustomerOrders = async (phone: string) => {    setSelectedCustomer(phone);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false });
    setCustomerOrders(data || []);
  };

  // --- Variants helpers ---
  const [variantOptionInputs, setVariantOptionInputs] = useState<Record<number, string>>({});

  const addVariant = () => {
    setProductForm(prev => ({
      ...prev,
      variants: [...prev.variants, { name: '', options: [] }],
    }));
  };

  const removeVariant = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
    setVariantOptionInputs(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const updateVariantName = (index: number, name: string) => {
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => i === index ? { ...v, name } : v),
    }));
  };

  const addVariantOption = (index: number) => {
    const val = (variantOptionInputs[index] || '').trim();
    if (!val) return;
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === index && !v.options.includes(val) ? { ...v, options: [...v.options, val] } : v
      ),
    }));
    setVariantOptionInputs(prev => ({ ...prev, [index]: '' }));
  };

  const removeVariantOption = (variantIndex: number, option: string) => {
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === variantIndex ? { ...v, options: v.options.filter(o => o !== option) } : v
      ),
    }));
  };

  // --- Product CRUD ---
  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) return;
    setSaving(true);
    try {
      const allImages = productForm.images.filter(Boolean);
      if (productForm.image_url && !allImages.includes(productForm.image_url)) {
        allImages.unshift(productForm.image_url);
      }
      const data = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price) || 0,
        compare_price: productForm.compare_price ? parseFloat(productForm.compare_price) : null,
        image_url: productForm.image_url,
        images: allImages,
        color_images: productForm.color_images,
        category_id: productForm.category_id || null,
        category_ids: productForm.category_ids.filter(Boolean),
        sku: productForm.sku,
        stock: parseInt(productForm.stock) || 0,
        is_featured: productForm.is_featured,
        is_active: productForm.is_active,
        variants: productForm.variants.filter(v => v.name && v.options.length > 0),
      };

      if (editingProductId) {
        const { error } = await supabase.from('products').update(data).eq('id', editingProductId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(data);
        if (error) throw error;
      }

      setShowProductForm(false);
      setEditingProductId(null);
      setProductForm(emptyProductForm);
      await fetchData();
    } catch (err) {
      console.error('Save product error:', err);
      alert('حدث خطأ أثناء حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Delete product error:', err);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    const existingImages = (product.images || []).filter((img: string) => img && img !== product.image_url);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      compare_price: product.compare_price?.toString() || '',
      image_url: product.image_url || '',
      images: existingImages,
      color_images: (product as any).color_images || {},
      category_id: product.category_id || '',
      category_ids: product.category_ids || [],
      sku: product.sku || '',
      stock: product.stock?.toString() || '0',
      is_featured: product.is_featured || false,
      is_active: product.is_active !== false,
      variants: product.variants || [],
    });
    setShowProductForm(true);
  };

  // --- Category CRUD ---
  const handleSaveCategory = async () => {
    if (!categoryForm.name || !categoryForm.slug) return;
    setSaving(true);
    try {
      const data = {
        name: categoryForm.name,
        slug: categoryForm.slug,
        description: categoryForm.description,
        image_url: categoryForm.image_url,
        sort_order: parseInt(categoryForm.sort_order) || 0,
        parent_id: categoryForm.parent_id || null,
        color: categoryForm.color || null,
      };
      if (editingCategoryId) {
        const { error } = await supabase.from('categories').update(data).eq('id', editingCategoryId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(data);
        if (error) throw error;
      }
      setShowCategoryForm(false);
      setEditingCategoryId(null);
      setCategoryForm(emptyCategoryForm);
      await fetchData();
    } catch (err) {
      console.error('Save category error:', err);
      alert('حدث خطأ أثناء حفظ القسم');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Delete category error:', err);
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image_url: cat.image_url || '',
      sort_order: cat.sort_order?.toString() || '0',
      parent_id: cat.parent_id || '',
      color: (cat as any).color || '',
    });
    setShowCategoryForm(true);
  };

  const handleReorderCategory = async (id: string, direction: 'up' | 'down', parentId: string | null) => {
    const group = categories.filter(c => (c.parent_id ?? null) === (parentId ?? null))
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = group.findIndex(c => c.id === id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === group.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updates = [
      { id: group[idx].id, sort_order: group[swapIdx].sort_order },
      { id: group[swapIdx].id, sort_order: group[idx].sort_order },
    ];
    await Promise.all(updates.map(u => supabase.from('categories').update({ sort_order: u.sort_order }).eq('id', u.id)));
    await fetchData();
  };

  // --- Settings ---
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsSaved(false);
    try {
      const rows = Object.entries(settingsForm).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('site_settings')
        .upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      await refreshSettings();
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      console.error('Save settings error:', err);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSettingsSaving(false);
    }
  };

  // --- Orders ---
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
      if (error) throw error;
      await fetchData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      console.error('Update order status error:', err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟ سيتم إرجاع الكمية للمخزن تلقائياً.')) return;
    setDeletingOrderId(orderId);
    try {
      // حذف order_items أولاً (triggers ترجع المخزن)
      await supabase.from('order_items').delete().eq('order_id', orderId);
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      setSelectedOrder(null);
      await fetchData();
    } catch (err) {
      console.error('Delete order error:', err);
      alert('حدث خطأ أثناء حذف الطلب');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    setOrderItems(data || []);
  };

  const generateSlug = (name: string) => {
    const slugMap: Record<string, string> = {
      'أقلام': 'pens', 'دفاتر': 'notebooks', 'مذكرات': 'notebooks',
      'أدوات مكتبية': 'office-supplies', 'ألوان': 'art-supplies', 'رسم': 'art-supplies',
      'حقائب': 'bags', 'شنط': 'bags', 'هندسية': 'geometry',
    };
    if (slugMap[name]) return slugMap[name];
    return name.replace(/\s+/g, '-').replace(/[^\w\u0600-\u06FF-]/g, '').toLowerCase();
  };

  const [productFilter, setProductFilter] = useState<'all' | 'out_of_stock' | 'hidden'>('all');

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.includes(searchQuery) || p.description?.includes(searchQuery);
    if (!matchesSearch) return false;
    if (productFilter === 'out_of_stock') return p.stock === 0;
    if (productFilter === 'hidden') return !p.is_active;
    return true;
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    onNavigate('login');
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المتجر</h1>
          <p className="text-gray-500 text-sm mt-1">إضافة وتعديل المنتجات والأقسام والمحتوى</p>
        </div>
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          العودة للمتجر
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {[
          { key: 'dashboard', label: 'لوحة التحكم', icon: BarChart3 },
          { key: 'products', label: `المنتجات (${products.length})`, icon: Package },
          { key: 'sale', label: `العروض (${products.filter(p => p.compare_price && p.compare_price > p.price).length})`, icon: Zap },
          { key: 'categories', label: `الأقسام (${categories.length})`, icon: Tag },
          { key: 'orders', label: `الطلبات (${orders.length})`, icon: ShoppingCart },
          { key: 'customers', label: 'العملاء', icon: Users },
          { key: 'admins', label: 'الأدمنز', icon: UserCog },
          { key: 'cms', label: 'المحتوى', icon: Layout },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ===== Products Tab ===== */}
      {tab === 'products' && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث في المنتجات..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              onClick={() => { setEditingProductId(null); setProductForm(emptyProductForm); setShowProductForm(true); }}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              إضافة منتج
            </button>
          </div>

          {/* Product filter tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { key: 'all',          label: `الكل (${products.length})`,                                                     color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
              { key: 'out_of_stock', label: `نفد المخزون (${products.filter(p => p.stock === 0).length})`,                   color: 'bg-red-50 text-red-600 hover:bg-red-100' },
              { key: 'hidden',       label: `مخفية (${products.filter(p => !p.is_active).length})`,                         color: 'bg-gray-50 text-gray-500 hover:bg-gray-100' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setProductFilter(key as typeof productFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  productFilter === key ? 'ring-2 ring-emerald-500 ' + color : color
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Product Form Modal */}
          {showProductForm && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-6 px-4 overflow-y-auto">
              <div className="bg-white rounded-2xl w-full max-w-2xl p-6 mb-10 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingProductId ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                  </h2>
                  <button onClick={() => setShowProductForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج *</label>
                      <input
                        value={productForm.name}
                        onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="مثال: قلم حبر أزرق"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">القسم الرئيسي</label>
                      <div className="relative">
                        <select
                          value={productForm.category_id}
                          onChange={e => setProductForm(prev => ({ ...prev, category_id: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none cursor-pointer"
                        >
                          <option value="">بدون قسم</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Additional categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">أقسام إضافية (اختياري)</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.filter(c => c.id !== productForm.category_id).map(cat => {
                        const isSelected = productForm.category_ids.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setProductForm(prev => ({
                              ...prev,
                              category_ids: isSelected
                                ? prev.category_ids.filter(id => id !== cat.id)
                                : [...prev.category_ids, cat.id],
                            }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                            }`}
                          >
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                    {productForm.category_ids.length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-1">يظهر المنتج في {productForm.category_ids.length + (productForm.category_id ? 1 : 0)} قسم</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                    <textarea
                      value={productForm.description}
                      onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      placeholder="وصف مختصر للمنتج"
                    />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">السعر (د.ع) *</label>
                      <input
                        type="number"
                        value={productForm.price}
                        onChange={e => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">السعر قبل الخصم</label>
                      <input
                        type="number"
                        value={productForm.compare_price}
                        onChange={e => setProductForm(prev => ({ ...prev, compare_price: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
                      <input
                        type="number"
                        value={productForm.stock}
                        onChange={e => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رابط الصورة الرئيسية</label>
                    <div className="flex gap-2">
                      <input
                        value={productForm.image_url}
                        onChange={e => setProductForm(prev => ({ ...prev, image_url: e.target.value }))}
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="https://images.pexels.com/..."
                        dir="ltr"
                      />
                      {productForm.image_url && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                          <img src={productForm.image_url} alt="preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional images */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">صور إضافية للمنتج</label>
                      <button
                        type="button"
                        onClick={() => setProductForm(prev => ({ ...prev, images: [...prev.images, ''] }))}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 border border-emerald-200 px-2.5 py-1.5 rounded-lg bg-emerald-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        إضافة صورة
                      </button>
                    </div>
                    <div className="space-y-2">
                      {productForm.images.map((img, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            value={img}
                            onChange={e => {
                              const imgs = [...productForm.images];
                              imgs[idx] = e.target.value;
                              setProductForm(prev => ({ ...prev, images: imgs }));
                            }}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="https://images.pexels.com/..."
                            dir="ltr"
                          />
                          {img && (
                            <div className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setProductForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Color → Image mapping */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">صور الألوان (لون → صورة)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const colorName = prompt('اسم اللون (مثال: أحمر)');
                          if (colorName?.trim()) {
                            setProductForm(prev => ({ ...prev, color_images: { ...prev.color_images, [colorName.trim()]: '' } }));
                          }
                        }}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 border border-emerald-200 px-2.5 py-1.5 rounded-lg bg-emerald-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        ربط لون بصورة
                      </button>
                    </div>
                    {Object.keys(productForm.color_images).length === 0 && (
                      <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5 border border-dashed border-gray-200">
                        مثال: اضغط "ربط لون بصورة" ثم أدخل اسم اللون (أحمر) وأضف رابط الصورة الخاصة به
                      </p>
                    )}
                    <div className="space-y-2">
                      {Object.entries(productForm.color_images).map(([color, imgUrl]) => (
                        <div key={color} className="flex gap-2 items-center">
                          <span className="text-sm font-medium text-gray-700 shrink-0 min-w-[60px]">{color}:</span>
                          <input
                            value={imgUrl}
                            onChange={e => setProductForm(prev => ({ ...prev, color_images: { ...prev.color_images, [color]: e.target.value } }))}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="https://images.pexels.com/..."
                            dir="ltr"
                          />
                          {imgUrl && (
                            <div className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                              <img src={imgUrl} alt={color} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const newCI = { ...productForm.color_images };
                              delete newCI[color];
                              setProductForm(prev => ({ ...prev, color_images: newCI }));
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رمز المنتج (SKU)</label>
                      <input
                        value={productForm.sku}
                        onChange={e => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="PEN-001"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex items-end gap-4 pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.is_featured}
                          onChange={e => setProductForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                          className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">منتج مميز</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.is_active}
                          onChange={e => setProductForm(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">متوفر</span>
                      </label>
                    </div>
                  </div>

                  {/* Variants */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">خيارات المنتج (لون، حجم...)</label>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 border border-emerald-200 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        إضافة نوع خيار
                      </button>
                    </div>
                    {productForm.variants.length === 0 && (
                      <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5 border border-dashed border-gray-200">
                        مثال: أضف خياراً باسم "اللون" ثم أضف الألوان (أحمر، أزرق...) — أو خياراً باسم "الحجم" (صغير، وسط، كبير)
                      </p>
                    )}
                    <div className="space-y-3">
                      {productForm.variants.map((variant, index) => (
                        <div key={index} className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2.5">
                          {/* Variant name row */}
                          <div className="flex gap-2 items-center">
                            <input
                              value={variant.name}
                              onChange={e => updateVariantName(index, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="اسم الخيار — مثال: اللون، الحجم، النوع..."
                            />
                            <button
                              type="button"
                              onClick={() => removeVariant(index)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {/* Existing options as tags */}
                          {variant.options.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {variant.options.map(option => (
                                <span key={option} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                                  {option}
                                  <button
                                    type="button"
                                    onClick={() => removeVariantOption(index, option)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Add option input */}
                          <div className="flex gap-2">
                            <input
                              value={variantOptionInputs[index] || ''}
                              onChange={e => setVariantOptionInputs(prev => ({ ...prev, [index]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVariantOption(index); } }}
                              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder={`أضف ${variant.name || 'خياراً'}... ثم اضغط Enter أو ➕`}
                            />
                            <button
                              type="button"
                              onClick={() => addVariantOption(index)}
                              disabled={!variantOptionInputs[index]?.trim()}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-40 flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              إضافة
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowProductForm(false)}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveProduct}
                    disabled={saving || !productForm.name || !productForm.price}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Save className="w-4 h-4" />{editingProductId ? 'حفظ التعديلات' : 'إضافة المنتج'}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse flex gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {filteredProducts.map(product => (
                  <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900 text-sm truncate">{product.name}</h3>
                        {product.is_featured && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">مميز</span>
                        )}
                        {!product.is_active && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">معطل</span>
                        )}
                        {product.variants?.length > 0 && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                            {product.variants.length} خيار
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-sm text-emerald-600 font-bold">{Number(product.price).toLocaleString()} د.ع</span>
                        {product.compare_price && (
                          <span className="text-xs text-gray-400 line-through">{Number(product.compare_price).toLocaleString()}</span>
                        )}
                        <span className={`text-xs font-medium ${product.stock <= 0 ? 'text-red-500' : product.stock <= 5 ? 'text-amber-600' : 'text-gray-400'}`}>
                          المخزون: {product.stock}
                        </span>
                        {product.categories && (
                          <span className="text-xs text-gray-400">{product.categories.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={async () => {
                          await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id);
                          await fetchData();
                        }}
                        title={product.is_active ? 'إخفاء المنتج' : 'إظهار المنتج'}
                        className={`p-2 rounded-lg transition-colors ${product.is_active ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-amber-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">لا توجد منتجات</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Sale / Offers Tab ===== */}
      {tab === 'sale' && (
        <div>
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-5">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">كيف تعمل العروض؟</p>
              <p className="text-xs text-amber-600 mt-0.5">أي منتج تضع له "سعر قبل الخصم" أعلى من السعر الحالي يظهر تلقائياً في قسم العروض على الصفحة الرئيسية.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{products.filter(p => p.compare_price && p.compare_price > p.price).length}</p>
              <p className="text-xs text-gray-500 mt-1">منتج عليه عرض</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {products.filter(p => p.compare_price && p.compare_price > p.price).length > 0
                  ? Math.round(products.filter(p => p.compare_price && p.compare_price > p.price)
                      .reduce((sum, p) => sum + ((p.compare_price! - p.price) / p.compare_price!) * 100, 0) /
                      products.filter(p => p.compare_price && p.compare_price > p.price).length)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">متوسط الخصم</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{products.filter(p => !p.compare_price || p.compare_price <= p.price).length}</p>
              <p className="text-xs text-gray-500 mt-1">بدون عرض</p>
            </div>
          </div>

          {/* Sale products list */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-gray-900 text-sm">المنتجات التي عليها عروض</h3>
              </div>
              <button
                onClick={() => { setTab('products'); setEditingProductId(null); setProductForm(emptyProductForm); setTimeout(() => setShowProductForm(true), 50); }}
                className="text-xs text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة منتج جديد
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {products.filter(p => p.compare_price && p.compare_price > p.price).map(product => {
                const disc = Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100);
                return (
                  <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900 text-sm truncate">{product.name}</h3>
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">-{disc}%</span>
                        {product.is_featured && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">مميز</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-emerald-600 font-bold">{Number(product.price).toLocaleString()} د.ع</span>
                        <span className="text-xs text-gray-400 line-through">{Number(product.compare_price).toLocaleString()} د.ع</span>
                        <span className="text-xs text-red-500 font-medium">
                          وفّر {(Number(product.compare_price) - Number(product.price)).toLocaleString()} د.ع
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Toggle sale: remove compare_price */}
                      <button
                        onClick={async () => {
                          await supabase.from('products').update({ compare_price: null }).eq('id', product.id);
                          await fetchData();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                        title="إزالة العرض"
                      >
                        <TrendingDown className="w-3.5 h-3.5" />
                        إزالة العرض
                      </button>
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {products.filter(p => p.compare_price && p.compare_price > p.price).length === 0 && (
                <div className="p-12 text-center">
                  <Zap className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-medium">لا توجد منتجات عليها عروض</p>
                  <p className="text-gray-400 text-xs mt-1">لإضافة عرض: افتح تعديل أي منتج وأدخل "سعر قبل الخصم"</p>
                </div>
              )}
            </div>
          </div>

          {/* Products without sale — quick add discount */}
          {products.filter(p => !p.compare_price || p.compare_price <= p.price).length > 0 && (
            <div className="mt-5 bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-700 text-sm">منتجات بدون عرض</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">اضغط تعديل لإضافة خصم</span>
              </div>
              <div className="divide-y divide-gray-50">
                {products.filter(p => !p.compare_price || p.compare_price <= p.price).map(product => (
                  <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{product.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{Number(product.price).toLocaleString()} د.ع</p>
                    </div>
                    <button
                      onClick={() => { setTab('products'); handleEditProduct(product); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      إضافة عرض
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Categories Tab ===== */}
      {tab === 'categories' && (() => {
        const topLevel = categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
        const childrenOf = (pid: string) => categories.filter(c => c.parent_id === pid).sort((a, b) => a.sort_order - b.sort_order);

        const CatRow = ({ cat, isChild }: { cat: Category; isChild?: boolean }) => {
          const kids = childrenOf(cat.id);
          const sameGroup = categories.filter(c => (c.parent_id ?? null) === (cat.parent_id ?? null)).sort((a, b) => a.sort_order - b.sort_order);
          const idx = sameGroup.findIndex(c => c.id === cat.id);
          return (
            <>
              <div className={`flex items-center gap-3 p-3.5 hover:bg-gray-50/60 transition-colors ${isChild ? 'pr-10 bg-gray-50/30' : ''}`}>
                {/* Up/Down arrows */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => handleReorderCategory(cat.id, 'up', cat.parent_id ?? null)}
                    disabled={idx === 0}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-20 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 -rotate-90 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleReorderCategory(cat.id, 'down', cat.parent_id ?? null)}
                    disabled={idx === sameGroup.length - 1}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-20 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 rotate-90 text-gray-500" />
                  </button>
                </div>

                {/* Icon */}
                <div className={`${isChild ? 'w-9 h-9' : 'w-11 h-11'} bg-gray-100 rounded-xl overflow-hidden shrink-0`}>
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tag className={`${isChild ? 'w-4 h-4' : 'w-5 h-5'} text-gray-300`} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isChild && <span className="w-3 h-px bg-gray-300 shrink-0" />}
                    <h3 className={`font-medium text-gray-900 ${isChild ? 'text-sm' : 'text-sm font-semibold'}`}>{cat.name}</h3>
                    {!isChild && kids.length > 0 && (
                      <span className="text-[11px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">{kids.length} فرعي</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400" dir="ltr">{cat.slug}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{products.filter(p => p.category_id === cat.id).length} منتج</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isChild && (
                    <button
                      onClick={() => { setEditingCategoryId(null); setCategoryForm({ ...emptyCategoryForm, parent_id: cat.id }); setShowCategoryForm(true); }}
                      title="إضافة قسم فرعي"
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleEditCategory(cat)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {kids.map(child => <CatRow key={child.id} cat={child} isChild />)}
            </>
          );
        };

        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">الأقسام</h2>
                <p className="text-xs text-gray-500 mt-0.5">{topLevel.length} قسم رئيسي · {categories.filter(c => c.parent_id).length} قسم فرعي</p>
              </div>
              <button
                onClick={() => { setEditingCategoryId(null); setCategoryForm(emptyCategoryForm); setShowCategoryForm(true); }}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                قسم رئيسي جديد
              </button>
            </div>

            {showCategoryForm && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
                <div className="bg-white rounded-2xl w-full max-w-lg p-6 mb-10 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">
                      {editingCategoryId ? 'تعديل القسم' : categoryForm.parent_id ? 'إضافة قسم فرعي' : 'إضافة قسم رئيسي'}
                    </h2>
                    <button onClick={() => setShowCategoryForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">القسم الرئيسي (اتركه فارغاً للقسم الرئيسي)</label>
                      <select
                        value={categoryForm.parent_id}
                        onChange={e => setCategoryForm(prev => ({ ...prev, parent_id: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="">— قسم رئيسي —</option>
                        {categories.filter(c => !c.parent_id && c.id !== editingCategoryId).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم القسم *</label>
                      <input
                        value={categoryForm.name}
                        onChange={e => { const name = e.target.value; setCategoryForm(prev => ({ ...prev, name, slug: generateSlug(name) })); }}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="مثال: أقلام"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الرابط (Slug)</label>
                      <input
                        value={categoryForm.slug}
                        onChange={e => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="pens"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                      <input
                        value={categoryForm.description}
                        onChange={e => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="وصف مختصر للقسم"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رابط الصورة</label>
                      <input
                        value={categoryForm.image_url}
                        onChange={e => setCategoryForm(prev => ({ ...prev, image_url: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="https://images.pexels.com/..."
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">لون القسم (اختياري)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={categoryForm.color || '#10b981'}
                          onChange={e => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                          className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5 bg-white"
                        />
                        <input
                          value={categoryForm.color}
                          onChange={e => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                          placeholder="#10b981 (اتركه فارغاً للون الافتراضي)"
                          dir="ltr"
                        />
                        {categoryForm.color && (
                          <div className="w-9 h-9 rounded-xl border border-gray-200 shrink-0" style={{ backgroundColor: categoryForm.color }} />
                        )}
                        {categoryForm.color && (
                          <button onClick={() => setCategoryForm(prev => ({ ...prev, color: '' }))} className="text-xs text-gray-400 hover:text-red-500">حذف</button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button onClick={() => setShowCategoryForm(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      إلغاء
                    </button>
                    <button
                      onClick={handleSaveCategory}
                      disabled={saving || !categoryForm.name}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" />{editingCategoryId ? 'حفظ التعديلات' : 'إضافة'}</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {topLevel.map(cat => <CatRow key={cat.id} cat={cat} />)}
                {topLevel.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">لا توجد أقسام</div>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== Dashboard Tab ===== */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm text-gray-500">المنتجات</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              <p className="text-xs text-gray-400 mt-1">{products.filter(p => p.is_active).length} نشط</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm text-gray-500">الطلبات</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              <p className="text-xs text-amber-600 mt-1">{orders.filter(o => o.status === 'pending').length} قيد الانتظار</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Tag className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">الأقسام</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-teal-600" />
                </div>
                <span className="text-sm text-gray-500">إجمالي المبيعات</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total), 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">د.ع</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">آخر الطلبات</h3>
              <button onClick={() => setTab('orders')} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">عرض الكل</button>
            </div>
            <div className="divide-y divide-gray-50">
              {orders.slice(0, 5).map(order => {
                const statusInfo = ORDER_STATUSES.find(s => s.key === order.status);
                return (
                  <div key={order.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => { setTab('orders'); handleViewOrder(order); }}>
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 text-sm truncate">{order.customer_name}</h4>
                        {statusInfo && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{order.customer_phone} | {new Date(order.created_at).toLocaleDateString('ar-IQ')}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 shrink-0">{Number(order.total).toLocaleString()} د.ع</span>
                  </div>
                );
              })}
              {orders.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">لا توجد طلبات بعد</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900">منتجات منخفضة المخزون</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {products.filter(p => (p.stock || 0) <= 5 && p.is_active).slice(0, 5).map(product => (
                <div key={product.id} className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{product.name}</h4>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${product.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {product.stock === 0 ? 'نفذت الكمية' : `${product.stock} قطعة`}
                  </span>
                </div>
              ))}
              {products.filter(p => (p.stock || 0) <= 5 && p.is_active).length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">جميع المنتجات متوفرة بكمية كافية</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Orders Tab ===== */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {/* Order Detail Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-6 px-4 overflow-y-auto">
              <div className="bg-white rounded-2xl w-full max-w-2xl p-6 mb-10 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">تفاصيل الطلب</h2>
                    <p className="text-xs text-gray-400 font-mono mt-0.5" dir="ltr">#{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteOrder(selectedOrder.id)}
                      disabled={deletingOrderId === selectedOrder.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200 disabled:opacity-50"
                    >
                      {deletingOrderId === selectedOrder.id ? (
                        <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      حذف الطلب
                    </button>
                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-4 grid sm:grid-cols-2 gap-3 text-sm mb-5">
                  <div>
                    <span className="text-gray-500 text-xs">العميل</span>
                    <p className="font-semibold text-gray-900 mt-0.5">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">الهاتف</span>
                    <p className="font-semibold text-gray-900 mt-0.5" dir="ltr">{selectedOrder.customer_phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">المحافظة</span>
                    <p className="font-semibold text-gray-900 mt-0.5">{selectedOrder.city || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">العنوان</span>
                    <p className="font-semibold text-gray-900 mt-0.5">{selectedOrder.address}</p>
                  </div>
                  {selectedOrder.customer_email && (
                    <div>
                      <span className="text-gray-500 text-xs">البريد</span>
                      <p className="font-semibold text-gray-900 mt-0.5" dir="ltr">{selectedOrder.customer_email}</p>
                    </div>
                  )}
                  {selectedOrder.notes && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 text-xs">ملاحظات</span>
                      <p className="font-semibold text-gray-900 mt-0.5">{selectedOrder.notes}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 text-xs">التاريخ</span>
                    <p className="font-semibold text-gray-900 mt-0.5">{new Date(selectedOrder.created_at).toLocaleDateString('ar-IQ')}</p>
                  </div>
                </div>

                {/* Order Items with images and options */}
                <div className="border border-gray-100 rounded-xl overflow-hidden mb-5">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm">المنتجات المطلوبة</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {orderItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.product_name} className="w-14 h-14 rounded-xl object-cover border border-gray-100 shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
                          {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(item.selected_options).map(([key, value]) => (
                                <span key={key} className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">الكمية: {item.quantity}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 shrink-0">{(Number(item.price) * item.quantity).toLocaleString()} د.ع</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-gray-900">الإجمالي</span>
                    <span className="text-lg font-bold text-emerald-600">{Number(selectedOrder.total).toLocaleString()} د.ع</span>
                  </div>
                </div>

                {/* Status update */}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">تحديث حالة الطلب</h3>
                  <div className="flex flex-wrap gap-2">
                    {ORDER_STATUSES.map(status => {
                      const Icon = status.icon;
                      const isActive = selectedOrder.status === status.key;
                      return (
                        <button
                          key={status.key}
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, status.key)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                            isActive ? `${status.color} ring-2 ring-offset-1 ring-current` : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {status.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setOrderFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                orderFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الكل ({orders.length})
            </button>
            {ORDER_STATUSES.map(status => {
              const count = orders.filter(o => o.status === status.key).length;
              return (
                <button
                  key={status.key}
                  onClick={() => setOrderFilter(status.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    orderFilter === status.key ? 'bg-gray-900 text-white' : `${status.color} hover:opacity-80`
                  }`}
                >
                  {status.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {orders
                .filter(o => orderFilter === 'all' || o.status === orderFilter)
                .map(order => {
                  const statusInfo = ORDER_STATUSES.find(s => s.key === order.status);
                  const StatusIcon = statusInfo?.icon || Clock;
                  return (
                    <div key={order.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${statusInfo?.color || 'bg-gray-100'}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 text-sm">{order.customer_name}</h4>
                          <span className="text-xs text-gray-400 font-mono" dir="ltr">#{order.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400" dir="ltr">{order.customer_phone}</span>
                          <span className="text-xs text-gray-400">{order.city}</span>
                          <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('ar-IQ')}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 shrink-0">{Number(order.total).toLocaleString()} د.ع</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          disabled={deletingOrderId === order.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingOrderId === order.id ? (
                            <div className="w-4 h-4 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              {orders.filter(o => orderFilter === 'all' || o.status === orderFilter).length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">لا توجد طلبات</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Customers Tab ===== */}
      {tab === 'customers' && (
        <div className="space-y-4">
          {/* Customer Orders Modal */}
          {selectedCustomer && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-6 px-4 overflow-y-auto">
              <div className="bg-white rounded-2xl w-full max-w-2xl p-6 mb-10 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">طلبات الزبون</h2>
                    <p className="text-sm text-gray-500 font-mono mt-0.5" dir="ltr">{selectedCustomer}</p>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                {customerOrders.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">لا توجد طلبات مسجّلة</div>
                ) : (
                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                    {customerOrders.map(order => {
                      const statusInfo = ORDER_STATUSES.find(s => s.key === order.status);
                      const Icon = statusInfo?.icon || Clock;
                      return (
                        <div key={order.id} className="flex items-center gap-4 p-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${statusInfo?.color || 'bg-gray-100'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-gray-900" dir="ltr">#{order.id.slice(0, 8).toUpperCase()}</span>
                              {statusInfo && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusInfo.color}`}>{statusInfo.label}</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{order.city} | {new Date(order.created_at).toLocaleDateString('ar-IQ')}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">{Number(order.total).toLocaleString()} د.ع</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">إجمالي العملاء</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm text-gray-500">عملاء طلبوا</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{customers.filter(c => (c.orderCount || 0) > 0).length}</p>
            </div>
          </div>

          {/* Customers List */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900">قائمة العملاء المسجّلين</h3>
            </div>
            {customersLoading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : customers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">لا يوجد عملاء مسجّلون بعد</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {customers.map(c => (
                  <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 text-sm">{c.name || 'بدون اسم'}</h4>
                        {(c.orderCount || 0) > 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                            {c.orderCount} طلب
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 font-mono" dir="ltr">{c.phone}</span>
                        <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('ar-IQ')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewCustomerOrders(c.phone)}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="عرض الطلبات"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Admins Tab ===== */}
      {tab === 'admins' && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <UserCog className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">إضافة أدمن جديد</p>
              <p className="text-xs text-amber-600 mt-0.5">يمكنك إضافة مشرفين إضافيين للمتجر من هنا. سيتمكنون من الدخول لصفحة الإدارة بكامل الصلاحيات.</p>
            </div>
          </div>

          {/* Add admin form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">إضافة أدمن جديد</h3>
            {adminError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{adminError}</div>
            )}
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="admin@example.com"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={e => setNewAdminPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>
            <button
              onClick={handleAddAdmin}
              disabled={addingAdmin || !newAdminEmail || !newAdminPassword}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {addingAdmin ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Plus className="w-4 h-4" />إضافة أدمن</>
              )}
            </button>
          </div>

          {/* Admins list */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900">المشرفون</h3>
            </div>
            {adminsLoading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : admins.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">لا يوجد مشرفون إضافيون</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {admins.map(admin => (
                  <div key={admin.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                      <UserCog className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm" dir="ltr">{admin.email}</p>
                      <p className="text-xs text-gray-400">{new Date(admin.created_at).toLocaleDateString('ar-IQ')}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAdmin(admin.id, admin.user_id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CMS Tab ===== */}
      {tab === 'cms' && (
        <div className="flex gap-6 min-h-[600px]">
          <div className="w-56 shrink-0 space-y-1">
            {SETTING_SECTIONS.map(section => {
              const Icon = section.icon;
              const isActive = activeSettingSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSettingSection(section.id)}
                  className={`w-full text-right px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                    isActive ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20' : section.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{section.label}</p>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-w-0">
            {SETTING_SECTIONS.filter(s => s.id === activeSettingSection).map(section => {
              const Icon = section.icon;

              // Special handling for instagram reviews posts
              if (section.id === 'reviews') {
                const saveReviews = async () => {
                  setSettingsSaving(true);
                  const postsJson = JSON.stringify(instagramPosts);
                  const updates = [
                    { key: 'instagram_posts', value: postsJson, updated_at: new Date().toISOString() },
                    ...section.fields.map(f => ({ key: f.key, value: settingsForm[f.key] || '', updated_at: new Date().toISOString() })),
                  ];
                  await supabase.from('site_settings').upsert(updates, { onConflict: 'key' });
                  await refreshSettings();
                  setSettingsSaving(false);
                  setSettingsSaved(true);
                  setTimeout(() => setSettingsSaved(false), 2000);
                };
                const addPost = () => {
                  setInstagramPosts(prev => [...prev, { id: Date.now().toString(), url: '' }]);
                };
                const updatePost = (id: string, url: string) => {
                  setInstagramPosts(prev => prev.map(p => p.id === id ? { ...p, url } : p));
                };
                const removePost = (id: string) => {
                  setInstagramPosts(prev => prev.filter(p => p.id !== id));
                };
                return (
                  <div key={section.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{section.label}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{section.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={addPost}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          إضافة منشور
                        </button>
                        <button
                          onClick={saveReviews}
                          disabled={settingsSaving}
                          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {settingsSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : settingsSaved ? (
                            <><CheckCircle className="w-4 h-4" />تم الحفظ</>
                          ) : (
                            <><SaveAll className="w-4 h-4" />حفظ</>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {section.fields.map(field => (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                            <input
                              value={settingsForm[field.key] || ''}
                              onChange={e => setSettingsForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder={field.placeholder}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-sm font-semibold text-gray-700 mb-3">منشورات إنستغرام المعروضة</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
                          أضف روابط منشورات إنستغرام (reels أو posts) — مثال: <span dir="ltr">https://www.instagram.com/p/SHORTCODE/</span>
                        </div>
                        {instagramPosts.length === 0 ? (
                          <div className="py-10 text-center text-gray-400">
                            <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                            </svg>
                            <p className="text-sm">لا توجد منشورات. اضغط "إضافة منشور".</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {instagramPosts.map((post, idx) => (
                              <div key={post.id} className="flex items-center gap-3 border border-gray-200 rounded-xl p-3">
                                <span className="text-xs font-semibold text-gray-400 w-5 shrink-0">{idx + 1}</span>
                                <input
                                  value={post.url}
                                  onChange={e => updatePost(post.id, e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                                  placeholder="https://www.instagram.com/p/..."
                                  dir="ltr"
                                />
                                <button
                                  onClick={() => removePost(post.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Special handling for promo banners
              if (section.id === 'promo_banners') {
                const savePromoBanners = async () => {
                  setSettingsSaving(true);
                  const json = JSON.stringify(promoBanners);
                  await supabase.from('site_settings').upsert({ key: 'promo_banners', value: json, updated_at: new Date().toISOString() }, { onConflict: 'key' });
                  await refreshSettings();
                  setSettingsSaving(false);
                  setSettingsSaved(true);
                  setTimeout(() => setSettingsSaved(false), 2000);
                };
                const addBanner = () => {
                  setPromoBanners(prev => [...prev, { id: Date.now().toString(), image: '', link: '', position: 'top', width: '', height: '' }]);
                };
                const updateBanner = (id: string, field: string, value: string) => {
                  setPromoBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
                };
                const removeBanner = (id: string) => {
                  setPromoBanners(prev => prev.filter(b => b.id !== id));
                };
                return (
                  <div key={section.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{section.label}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{section.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={addBanner}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          بنر جديد
                        </button>
                        <button
                          onClick={savePromoBanners}
                          disabled={settingsSaving}
                          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {settingsSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : settingsSaved ? (
                            <><CheckCircle className="w-4 h-4" />تم الحفظ</>
                          ) : (
                            <><SaveAll className="w-4 h-4" />حفظ</>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-700">
                        <p className="font-semibold mb-1">كيفية استخدام البنرات:</p>
                        <ul className="text-xs space-y-1 list-disc list-inside">
                          <li><strong>صورة:</strong> رابط URL للصورة</li>
                          <li><strong>الرابط:</strong> اسم قسم (مثال: pens) أو صفحة (مثال: products)</li>
                          <li><strong>الموضع:</strong> top = أعلى الصفحة، middle = بين المنتجات، bottom = أسفل الصفحة</li>
                        </ul>
                      </div>
                      {promoBanners.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                          <Link className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                          <p className="text-sm">لا توجد بنرات. اضغط "بنر جديد" لإضافة بنر.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {promoBanners.map((banner, idx) => (
                            <div key={banner.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700">بنر {idx + 1}</span>
                                <button
                                  onClick={() => removeBanner(banner.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">رابط الصورة (URL)</label>
                                <div className="flex gap-2">
                                  <input
                                    value={banner.image}
                                    onChange={e => updateBanner(banner.id, 'image', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="https://images.pexels.com/..."
                                    dir="ltr"
                                  />
                                  {banner.image && (
                                    <div className="w-12 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                      <img src={banner.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">الرابط (slug أو صفحة)</label>
                                  <input
                                    value={banner.link}
                                    onChange={e => updateBanner(banner.id, 'link', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="products أو اسم قسم"
                                    dir="ltr"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">الموضع</label>
                                  <select
                                    value={banner.position}
                                    onChange={e => updateBanner(banner.id, 'position', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                  >
                                    <option value="top">أعلى الصفحة (top)</option>
                                    <option value="middle">وسط الصفحة (middle)</option>
                                    <option value="bottom">أسفل الصفحة (bottom)</option>
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">العرض (مثال: 100%, 400px)</label>
                                  <input
                                    value={banner.width || ''}
                                    onChange={e => updateBanner(banner.id, 'width', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="100% أو 400px"
                                    dir="ltr"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">الارتفاع (مثال: 200px, auto)</label>
                                  <input
                                    value={banner.height || ''}
                                    onChange={e => updateBanner(banner.id, 'height', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="200px أو auto"
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Special handling for video banners
              if (section.id === 'video_banners') {
                const saveVideoBanners = async () => {
                  setSettingsSaving(true);
                  const json = JSON.stringify(videoBanners);
                  await supabase.from('site_settings').upsert({ key: 'video_banners', value: json, updated_at: new Date().toISOString() }, { onConflict: 'key' });
                  await refreshSettings();
                  setSettingsSaving(false);
                  setSettingsSaved(true);
                  setTimeout(() => setSettingsSaved(false), 2000);
                };
                const addVideo = () => {
                  setVideoBanners(prev => [...prev, { id: Date.now().toString(), url: '', poster: '', position: 'middle', title: '', maxHeight: '480', width: '100%' }]);
                };
                const updateVideo = (id: string, field: string, value: string) => {
                  setVideoBanners(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
                };
                const removeVideo = (id: string) => {
                  setVideoBanners(prev => prev.filter(v => v.id !== id));
                };
                return (
                  <div key={section.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{section.label}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{section.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={addVideo} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
                          <Plus className="w-4 h-4" />فيديو جديد
                        </button>
                        <button onClick={saveVideoBanners} disabled={settingsSaving} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                          {settingsSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : settingsSaved ? <><CheckCircle className="w-4 h-4" />تم الحفظ</> : <><SaveAll className="w-4 h-4" />حفظ</>}
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-700">
                        <p className="font-semibold mb-1">ملاحظة:</p>
                        <ul className="text-xs space-y-1 list-disc list-inside">
                          <li>أضف رابط مباشر للفيديو (mp4, webm) — يُفضل رفعه على Supabase Storage أو أي CDN</li>
                          <li>الموضع: top = أعلى الصفحة، middle = بين الأقسام، bottom = أسفل الصفحة</li>
                          <li>صورة الغلاف (poster) تظهر قبل تشغيل الفيديو</li>
                        </ul>
                      </div>
                      {videoBanners.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                          <p className="text-sm">لا توجد فيديوهات. اضغط "فيديو جديد" للإضافة.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {videoBanners.map((vid, idx) => (
                            <div key={vid.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700">فيديو {idx + 1}</span>
                                <button onClick={() => removeVideo(vid.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">رابط الفيديو (mp4)</label>
                                <input value={vid.url} onChange={e => updateVideo(vid.id, 'url', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="https://...video.mp4" dir="ltr" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">صورة الغلاف (اختياري)</label>
                                  <input value={vid.poster} onChange={e => updateVideo(vid.id, 'poster', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="https://...image.jpg" dir="ltr" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">الموضع</label>
                                  <select value={vid.position} onChange={e => updateVideo(vid.id, 'position', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                                    <option value="top">أعلى الصفحة (top)</option>
                                    <option value="middle">بين الأقسام (middle)</option>
                                    <option value="bottom">أسفل الصفحة (bottom)</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">عنوان الفيديو (اختياري)</label>
                                <input value={vid.title} onChange={e => updateVideo(vid.id, 'title', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="مثال: شاهد كيف نصنع الفرق" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">عرض الفيديو — مثال: 100% أو 800px</label>
                                  <input value={vid.width} onChange={e => updateVideo(vid.id, 'width', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="100%" dir="ltr" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">أقصى ارتفاع (px) — مثال: 480</label>
                                  <input value={vid.maxHeight} onChange={e => updateVideo(vid.id, 'maxHeight', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="480" dir="ltr" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Special handling for customer photos
              if (section.id === 'customer_photos') {
                const saveCustomerPhotos = async () => {
                  setSettingsSaving(true);
                  const json = JSON.stringify(customerPhotos);
                  const updates = [
                    { key: 'customer_photos', value: json, updated_at: new Date().toISOString() },
                    ...section.fields.map(f => ({ key: f.key, value: settingsForm[f.key] || '', updated_at: new Date().toISOString() })),
                  ];
                  await supabase.from('site_settings').upsert(updates, { onConflict: 'key' });
                  await refreshSettings();
                  setSettingsSaving(false);
                  setSettingsSaved(true);
                  setTimeout(() => setSettingsSaved(false), 2000);
                };
                const addPhoto = () => {
                  setCustomerPhotos(prev => [...prev, { id: Date.now().toString(), image: '', username: '', caption: '' }]);
                };
                const updatePhoto = (id: string, field: string, value: string) => {
                  setCustomerPhotos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
                };
                const removePhoto = (id: string) => {
                  setCustomerPhotos(prev => prev.filter(p => p.id !== id));
                };
                return (
                  <div key={section.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{section.label}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{section.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={addPhoto} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
                          <Plus className="w-4 h-4" />إضافة صورة
                        </button>
                        <button onClick={saveCustomerPhotos} disabled={settingsSaving} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                          {settingsSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : settingsSaved ? <><CheckCircle className="w-4 h-4" />تم الحفظ</> : <><SaveAll className="w-4 h-4" />حفظ</>}
                        </button>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      {section.fields.map(field => (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                          {field.key === 'customer_photos_position' ? (
                            <select value={settingsForm[field.key] || 'before_why_us'} onChange={e => setSettingsForm(prev => ({ ...prev, [field.key]: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                              <option value="top">أعلى الصفحة (بعد الهيرو)</option>
                              <option value="after_featured">بعد المنتجات المميزة</option>
                              <option value="after_sale">بعد قسم العروض</option>
                              <option value="before_why_us">قبل لماذا نختار سحاب (افتراضي)</option>
                              <option value="bottom">أسفل الصفحة</option>
                            </select>
                          ) : (
                            <input value={settingsForm[field.key] || ''} onChange={e => setSettingsForm(prev => ({ ...prev, [field.key]: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder={field.placeholder} dir={field.ltr ? 'ltr' : undefined} />
                          )}
                        </div>
                      ))}
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-sm font-semibold text-gray-700 mb-3">صور الزبائن</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
                          أضف رابط صورة (URL) لكل صورة + اسم الحساب (اختياري) + وصف قصير (اختياري)
                        </div>
                        {customerPhotos.length === 0 ? (
                          <div className="py-10 text-center text-gray-400">
                            <p className="text-sm">لا توجد صور. اضغط "إضافة صورة".</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {customerPhotos.map((photo, idx) => (
                              <div key={photo.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-gray-500">صورة {idx + 1}</span>
                                  <button onClick={() => removePhoto(photo.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">رابط الصورة (URL)</label>
                                  <div className="flex gap-2">
                                    <input value={photo.image} onChange={e => updatePhoto(photo.id, 'image', e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" placeholder="https://..." dir="ltr" />
                                    {photo.image && (
                                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                        <img src={photo.image} alt="" className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">اسم الحساب (@username)</label>
                                    <input value={photo.username} onChange={e => updatePhoto(photo.id, 'username', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" placeholder="@suhab.iq" dir="ltr" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">وصف قصير (اختياري)</label>
                                    <input value={photo.caption} onChange={e => updatePhoto(photo.id, 'caption', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" placeholder="منتجات رائعة..." />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={section.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{section.label}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{section.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveSettings}
                      disabled={settingsSaving}
                      className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {settingsSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : settingsSaved ? (
                        <><CheckCircle className="w-4 h-4" />تم الحفظ</>
                      ) : (
                        <><SaveAll className="w-4 h-4" />حفظ</>
                      )}
                    </button>
                  </div>
                  <div className="p-6 space-y-5">
                    {section.fields.map(field => (
                      <div key={field.key} className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea
                            value={settingsForm[field.key] ?? ''}
                            onChange={e => setSettingsForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            rows={3}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-shadow"
                          />
                        ) : field.type === 'color' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={settingsForm[field.key] || '#111827'}
                                onChange={e => setSettingsForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="w-12 h-11 rounded-xl border-2 border-gray-200 cursor-pointer p-0.5 bg-white"
                              />
                              <input
                                value={settingsForm[field.key] ?? ''}
                                onChange={e => setSettingsForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                placeholder={field.placeholder || 'اختر لوناً أو اكتب #hex'}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow font-mono"
                                dir="ltr"
                              />
                              {settingsForm[field.key] ? (
                                <>
                                  <div
                                    className="w-11 h-11 rounded-xl border-2 border-gray-200 shrink-0 shadow-sm"
                                    style={{ backgroundColor: settingsForm[field.key] }}
                                    title="معاينة اللون"
                                  />
                                  <button
                                    onClick={() => setSettingsForm(prev => ({ ...prev, [field.key]: '' }))}
                                    className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors shrink-0"
                                    title="إعادة للون الافتراضي"
                                  >
                                    إعادة
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-gray-400 shrink-0">افتراضي</span>
                              )}
                            </div>
                          </div>
                        ) : field.type === 'select' && field.options ? (
                          <select
                            value={settingsForm[field.key] ?? ''}
                            onChange={e => setSettingsForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow bg-white"
                          >
                            <option value="">— اختر —</option>
                            {field.options.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : field.type === 'range' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min={field.min ?? 0}
                                max={field.max ?? 1000}
                                step={field.step ?? 1}
                                value={settingsForm[field.key] ?? field.placeholder ?? field.min ?? 0}
                                onChange={e => setSettingsForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="flex-1 accent-emerald-600"
                              />
                              <div className="flex items-center gap-1 min-w-[80px]">
                                <input
                                  type="number"
                                  min={field.min}
                                  max={field.max}
                                  step={field.step ?? 1}
                                  value={settingsForm[field.key] ?? field.placeholder ?? ''}
                                  onChange={e => setSettingsForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                  className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  dir="ltr"
                                />
                                {field.unit && <span className="text-xs text-gray-400">{field.unit}</span>}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <input
                            value={settingsForm[field.key] ?? ''}
                            onChange={e => setSettingsForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                            dir={field.ltr ? 'ltr' : 'rtl'}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
