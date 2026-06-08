import { useState, useCallback } from 'react';
import { CartProvider } from './hooks/useCart';
import { AuthProvider } from './hooks/useAuth';
import { SettingsProvider } from './hooks/useSettings';
import { CustomerProvider } from './hooks/useCustomer';
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

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [saleOnly, setSaleOnly] = useState(false);

  const handleNavigate = useCallback((page: Page, data?: Record<string, string>) => {
    if (page === 'product-detail' && data?.productId) {
      setSelectedProductId(data.productId);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleViewDetail = useCallback((product: Product) => {
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
            onBack={() => handleNavigate('products')}
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
    <AuthProvider>
      <SettingsProvider>
        <CustomerProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </CustomerProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
