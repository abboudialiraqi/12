import { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, Menu, X, Search, Settings, LogOut, User,
  Home, Package, Tag, ChevronLeft, ChevronRight, LayoutGrid, Moon, Sun
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useCustomer } from '../hooks/useCustomer';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../hooks/useTheme';
import { supabase, type Category } from '../lib/supabase';

type Page = 'home' | 'products' | 'cart' | 'checkout' | 'product-detail' | 'admin' | 'login' | 'account';

type HeaderProps = {
  currentPage: Page;
  onNavigate: (page: Page, data?: Record<string, string>) => void;
  onSearch: (query: string) => void;
  selectedCategory: string | null;
  onCategorySelect: (slug: string | null) => void;
  onSaleNavigate: () => void;
};

const DEFAULT_TICKER_ITEMS = [
  { icon: '🚚', text: 'توصيل مجاني للطلبات فوق 100,000 د.ع' },
  { icon: '⭐', text: 'خصومات تصل إلى 30% على منتجات مختارة' },
  { icon: '🛡️', text: 'ضمان الجودة على جميع المنتجات' },
  { icon: '📦', text: 'بغداد خلال 24 ساعة | المحافظات خلال 48 ساعة' },
  { icon: '💳', text: 'الدفع عند الاستلام متاح لجميع المحافظات' },
];

export default function Header({ currentPage, onNavigate, onSearch, selectedCategory, onCategorySelect, onSaleNavigate }: HeaderProps) {
  const { totalItems } = useCart();
  const { isAdmin, signOut: adminSignOut } = useAuth();
  const { customer } = useCustomer();
  const { get } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      setCategories(data || []);
    });
  }, []);

  const topBarText = get('top_bar_text', '');
  const tickerItems = topBarText
    ? topBarText.split('|').map(t => ({ icon: '✦', text: t.trim() })).filter(t => t.text)
    : DEFAULT_TICKER_ITEMS;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
    onNavigate('products');
    setSearchOpen(false);
  };

  const handleAdminClick = () => {
    if (isAdmin) onNavigate('admin');
    else onNavigate('login');
  };

  const handleAdminSignOut = async () => {
    await adminSignOut();
    onNavigate('home');
  };

  const topCategories = categories.filter(c => !c.parent_id);
  const childrenOf = (pid: string) => categories.filter(c => c.parent_id === pid);

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        {/* ── Animated Ticker Bar ── */}
        <div className="bg-emerald-600 text-white overflow-hidden py-1.5 select-none">
          <div className="flex animate-ticker whitespace-nowrap">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 mx-6 text-xs font-medium">
                <span>{item.icon}</span>
                <span>{item.text}</span>
                <span className="mx-3 opacity-40">|</span>
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Sidebar toggle + Logo */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="الأقسام"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => { onNavigate('home'); onCategorySelect(null); }}
                className="flex items-center group"
              >
                <img
                  src={get('store_logo_url', '') || '/0F1E3BB9-5C5B-49D4-BDB7-918B8DE3DD64.PNG'}
                  alt={get('store_name', 'سحاب')}
                  className="h-12 w-12 object-contain group-hover:scale-105 transition-transform duration-200"
                />
              </button>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-0.5" ref={dropdownRef}>
              <NavItem
                icon={<Home className="w-3.5 h-3.5" />}
                label="الرئيسية"
                active={currentPage === 'home' && !selectedCategory}
                onClick={() => { onNavigate('home'); onCategorySelect(null); }}
              />
              <NavItem
                icon={<Package className="w-3.5 h-3.5" />}
                label="جميع المنتجات"
                active={currentPage === 'products' && !selectedCategory}
                onClick={() => { onNavigate('products'); onCategorySelect(null); }}
              />
              <NavItem
                icon={<Tag className="w-3.5 h-3.5" />}
                label="العروض"
                active={false}
                onClick={onSaleNavigate}
                highlight
              />
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <ActionIcon
                title="بحث"
                active={searchOpen}
                onClick={() => setSearchOpen(!searchOpen)}
              >
                <Search className="w-5 h-5" />
              </ActionIcon>

              <ActionIcon
                title={customer ? `حسابي — ${customer.name || customer.phone}` : 'حسابي'}
                active={currentPage === 'account'}
                onClick={() => onNavigate('account')}
                badge={customer ? 'dot' : undefined}
              >
                <User className="w-5 h-5" />
              </ActionIcon>

              <button
                onClick={() => onNavigate('cart')}
                className="relative p-2 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-150 group"
                title="السلة"
              >
                <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform duration-150" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Settings icon — admin only */}
              {isAdmin && (
                <>
                  <ActionIcon title="تسجيل الخروج" onClick={handleAdminSignOut}>
                    <LogOut className="w-5 h-5" />
                  </ActionIcon>
                  <ActionIcon
                    title="إدارة المتجر"
                    active={currentPage === 'admin'}
                    onClick={() => onNavigate('admin')}
                  >
                    <Settings className="w-5 h-5" />
                  </ActionIcon>
                </>
              )}

              {/* Dark/light toggle */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
                className="p-2 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-150"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-3 animate-in slide-in-from-top">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن منتج..."
                  className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                بحث
              </button>
            </form>
          </div>
        )}

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 animate-in slide-in-from-top">
            <MobileNavItem icon={<Home className="w-4 h-4" />} label="الرئيسية"
              onClick={() => { onNavigate('home'); onCategorySelect(null); setMobileMenuOpen(false); }} />
            <MobileNavItem icon={<Package className="w-4 h-4" />} label="جميع المنتجات"
              onClick={() => { onNavigate('products'); onCategorySelect(null); setMobileMenuOpen(false); }} />
            <MobileNavItem icon={<Tag className="w-4 h-4" />} label="العروض" highlight
              onClick={() => { onSaleNavigate(); setMobileMenuOpen(false); }} />
            <MobileNavItem icon={<LayoutGrid className="w-4 h-4" />} label="الأقسام"
              onClick={() => { setSidebarOpen(true); setMobileMenuOpen(false); }} />

            <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
              <MobileNavItem
                icon={<User className="w-4 h-4" />}
                label={customer ? `حسابي (${customer.name || customer.phone})` : 'حسابي'}
                onClick={() => { onNavigate('account'); setMobileMenuOpen(false); }}
              />
              {isAdmin && (
                <>
                  <MobileNavItem
                    icon={<Settings className="w-4 h-4" />}
                    label="إدارة المتجر"
                    onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }}
                  />
                  <MobileNavItem
                    icon={<LogOut className="w-4 h-4" />}
                    label="تسجيل الخروج (إدارة)"
                    onClick={() => { handleAdminSignOut(); setMobileMenuOpen(false); }}
                    danger
                  />
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Categories Sidebar ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60] flex flex-row-reverse">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer — slides in from the right */}
          <div className="w-80 bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-emerald-600">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-white" />
                <h2 className="font-bold text-white">الأقسام</h2>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* All Products */}
            <button
              onClick={() => { onNavigate('products'); onCategorySelect(null); setSidebarOpen(false); }}
              className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 hover:bg-emerald-50 transition-colors text-right w-full group"
            >
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="font-semibold text-gray-900 text-sm">جميع المنتجات</span>
            </button>

            {/* Category list */}
            <div className="flex-1 overflow-y-auto py-2">
              {topCategories.map(cat => {
                const kids = childrenOf(cat.id);
                const isExpanded = expandedCats.has(cat.id);
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-1 hover:bg-gray-50 transition-colors group">
                      <button
                        onClick={() => { onCategorySelect(cat.slug); onNavigate('products'); setSidebarOpen(false); }}
                        className="flex items-center gap-3 flex-1 px-5 py-3 text-right"
                      >
                        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                          {cat.image_url ? (
                            <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Tag className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">{cat.name}</p>
                          {kids.length > 0 && (
                            <p className="text-[11px] text-gray-400">{kids.length} قسم فرعي</p>
                          )}
                        </div>
                      </button>
                      {kids.length > 0 && (
                        <button
                          onClick={() => toggleCat(cat.id)}
                          className="p-2 ml-1 text-gray-400 hover:text-emerald-600 transition-colors shrink-0"
                        >
                          {isExpanded
                            ? <ChevronLeft className="w-4 h-4 rotate-90" />
                            : <ChevronLeft className="w-4 h-4 -rotate-90" />
                          }
                        </button>
                      )}
                    </div>
                    {isExpanded && kids.map(child => (
                      <button
                        key={child.id}
                        onClick={() => { onCategorySelect(child.slug); onNavigate('products'); setSidebarOpen(false); }}
                        className="flex items-center gap-3 w-full pr-14 pl-5 py-2.5 hover:bg-emerald-50 transition-colors text-right"
                      >
                        <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                          {child.image_url ? (
                            <img src={child.image_url} alt={child.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Tag className="w-3 h-3 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">{child.name}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
              {topCategories.length === 0 && (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">لا توجد أقسام</div>
              )}
            </div>

            {/* Bottom: Offers */}
            <div className="border-t border-gray-100 p-4">
              <button
                onClick={() => { onSaleNavigate(); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <Tag className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-semibold text-red-600 text-sm">العروض والتخفيضات</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Sub-components ── */

function NavItem({
  icon, label, active, onClick, highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
        active
          ? 'text-emerald-600 bg-emerald-50'
          : highlight
          ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
          : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
      }`}
    >
      {icon && (
        <span className={`transition-transform duration-150 group-hover:scale-110 ${active ? 'text-emerald-600' : highlight ? 'text-rose-500' : 'text-gray-400 group-hover:text-emerald-500'}`}>
          {icon}
        </span>
      )}
      {label}
    </button>
  );
}

function ActionIcon({
  children, onClick, title, active, badge,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
  badge?: 'dot' | string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative p-2 rounded-lg transition-all duration-150 group ${
        active ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
      }`}
    >
      <span className="block group-hover:scale-110 transition-transform duration-150">{children}</span>
      {badge === 'dot' && (
        <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
      )}
    </button>
  );
}

function MobileNavItem({
  icon, label, onClick, highlight, danger, sub,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean;
  danger?: boolean;
  sub?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full text-right px-3 py-2 rounded-lg transition-colors ${
        sub ? 'text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700'
        : danger ? 'text-sm font-medium text-red-600 hover:bg-red-50'
        : highlight ? 'text-sm font-medium text-rose-600 hover:bg-rose-50'
        : 'text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600'
      }`}
    >
      {icon && <span className={danger ? 'text-red-400' : highlight ? 'text-rose-400' : 'text-gray-400'}>{icon}</span>}
      {label}
    </button>
  );
}
