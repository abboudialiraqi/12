import { useState, useCallback } from 'react';
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

type PageState = {
  page: Page;
  category?: string | null;
  productId?: string;
  searchQuery?: string;
  saleOnly?: boolean;
  scrollY?: number;
};

function AppContent() {
  const [navStack, setNavStack] = useState<PageState[]>([{ page: 'home' }]);
  const currentState = navStack[navStack.length - 1];
  const currentPage = currentState.page;
  const selectedCategory = currentState.category ?? null;
  const selectedProductId = currentState.productId ?? '';
  const searchQuery = currentState.searchQuery ?? '';
  const saleOnly = currentState.saleOnly ?? false;

  const handleNavigate = useCallback((page: Page, data?: Record<string, string>) => {
    const scrollY = window.scrollY;
    setNavStack(stack => {
      const top = stack[stack.length - 1];
      const saved = { ...top, scrollY };
      const next: PageState = { page };
      if (page === 'product-detail' && data?.productId) next.productId = data.productId;
      return [...stack.slice(0, -1), saved, next];
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    setNavStack(stack => {
      if (stack.length <= 1) return [{ page: 'home' }];
      const prev = stack[stack.length - 2];
      const newStack = stack.slice(0, -1);
      const savedY = prev.scrollY ?? 0;
      setTimeout(() => window.scrollTo({ top: savedY, behavior: 'instant' as ScrollBehavior }), 50);
      return newStack;
    });
  }, []);

  const handleCategorySelect = useCallback((slug: string | null) => {
    setNavStack(stack => {
      const top = stack[stack.length - 1];
      return [...stack.slice(0, -1), { ...top, category: slug, saleOnly: false }];
    });
  }, []);

  const handleSaleNavigate = useCallback(() => {
    setNavStack(stack => {
      const scrollY = window.scrollY;
      const top = stack[stack.length - 1];
      return [...stack.slice(0, -1), { ...top, scrollY }, { page: 'products', saleOnly: true, category: null, searchQuery: '' }];
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setNavStack(stack => {
      const top = stack[stack.length - 1];
      return [...stack.slice(0, -1), { ...top, searchQuery: query }];
    });
  }, []);

  const handleViewDetail = useCallback((product: Product) => {
    setNavStack(stack => {
      const scrollY = window.scrollY;
      const top = stack[stack.length - 1];
      const saved = { ...top, scrollY };
      return [...stack.slice(0, -1), saved, { page: 'product-detail', productId: product.id }];
    });
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
            onClearSale={() => setNavStack(stack => {
              const top = stack[stack.length - 1];
              return [...stack.slice(0, -1), { ...top, saleOnly: false }];
            })}
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
