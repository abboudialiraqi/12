import { useState, useCallback, useRef, useEffect } from 'react';
import { CartProvider } from './hooks/useCart';
import { AuthProvider } from './hooks/useAuth';
import { SettingsProvider } from './hooks/useSettings';
import { CustomerProvider } from './hooks/useCustomer';
import { ThemeProvider } from './hooks/useTheme';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import CustomerAccountPage from './pages/CustomerAccountPage';
import type { Product } from './lib/supabase';

type Page = 'home' | 'products' | 'cart' | 'checkout' | 'product-detail' | 'admin' | 'login' | 'account';

type BackSnapshot = {
  page: Page;
  category: string | null;
  saleOnly: boolean;
  searchQuery: string;
  scrollY: number;
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [saleOnly, setSaleOnly] = useState(false);

  // Refs always hold the latest values so handleViewDetail never has a stale closure
  const pageRef = useRef(currentPage);
  const categoryRef = useRef(selectedCategory);
  const saleOnlyRef = useRef(saleOnly);
  const searchQueryRef = useRef(searchQuery);
  useEffect(() => { pageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { categoryRef.current = selectedCategory; }, [selectedCategory]);
  useEffect(() => { saleOnlyRef.current = saleOnly; }, [saleOnly]);
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);

  // One level of back history — only needed when entering product detail
  const backSnap = useRef<BackSnapshot | null>(null);

  const handleNavigate = useCallback((page: Page, data?: Record<string, string>) => {
    if (page === 'product-detail' && data?.productId) {
      setSelectedProductId(data.productId);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    const snap = backSnap.current;
    backSnap.current = null;
    if (snap) {
      setSelectedCategory(snap.category);
      setSaleOnly(snap.saleOnly);
      setSearchQuery(snap.searchQuery);
      setCurrentPage(snap.page);
      const savedY = snap.scrollY;
      setTimeout(() => window.scrollTo({ top: savedY, behavior: 'instant' as ScrollBehavior }), 50);
    } else {
      setCurrentPage('home');
    }
  }, []);

  const handleCategorySelect = useCallback((slug: string | null) => {
    setSelectedCategory(slug);
    setSaleOnly(false);
  }, []);

  const handleSaleNavigate = useCallback(() => {
    setSaleOnly(true);
    setSelectedCategory(null);
    setSearchQuery('');
    setCurrentPage('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Stable identity ([] deps) — reads state via refs so it's never stale
  const handleViewDetail = useCallback((product: Product) => {
    backSnap.current = {
      page: pageRef.current,
      category: categoryRef.current,
      saleOnly: saleOnlyRef.current,
      searchQuery: searchQueryRef.current,
      scrollY: window.scrollY,
    };
    setSelectedProductId(product.id);
    setCurrentPage('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            onNavigate={handleNavigate as any}
            onCategorySelect={handleCategorySelect}
            onViewDetail={handleViewDetail}
            onSaleNavigate={handleSaleNavigate}
          />
        );
      case 'products':
        return (
          <ProductsPage
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
            searchQuery={searchQuery}
            onViewDetail={handleViewDetail}
            saleOnly={saleOnly}
            onClearSale={() => setSaleOnly(false)}
          />
        );
      case 'product-detail':
        return (
          <ProductDetailPage
            productId={selectedProductId}
            onBack={handleBack}
            onViewDetail={handleViewDetail}
          />
        );
      case 'cart':
        return <CartPage onNavigate={handleNavigate as any} />;
      case 'checkout':
        return <CheckoutPage onNavigate={handleNavigate as any} />;
      case 'login':
        return <LoginPage onNavigate={handleNavigate as any} />;
      case 'admin':
        return <AdminPage onNavigate={handleNavigate as any} />;
      case 'account':
        return <CustomerAccountPage onNavigate={handleNavigate as any} onViewDetail={handleViewDetail} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
        onSaleNavigate={handleSaleNavigate}
      />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <CustomerProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </CustomerProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
