import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  Camera, 
  ShoppingBag, 
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import type { Product, Category, Cart, User, StoreConfig, Order } from './types';
import { api } from './api';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { VisualSearchModal } from './components/VisualSearchModal';
import { AdminDashboard } from './components/AdminDashboard';
import { OrderTrackingView } from './components/OrderTrackingView';
import { PolicyModal } from './components/PolicyModal';
import { UserProfileModal } from './components/UserProfileModal';
import { Footer } from './components/Footer';
import { FullScreenAIAssistant } from './components/FullScreenAIAssistant';

export function App() {
  // Navigation & Config
  const [currentView, setCurrentView] = useState<'home' | 'catalog' | 'orders' | 'admin' | 'assistant'>('home');
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [_categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Department State
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [sabjiProducts, setSabjiProducts] = useState<Product[]>([]);
  const [clothingProducts, setClothingProducts] = useState<Product[]>([]);
  const [drinksProducts, setDrinksProducts] = useState<Product[]>([]);
  const [electronicsProducts, setElectronicsProducts] = useState<Product[]>([]);
  const [pantryProducts, setPantryProducts] = useState<Product[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [isOrganicOnly, setIsOrganicOnly] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [showFilters, setShowFilters] = useState(false);

  // Cart State
  const [cart, setCart] = useState<Cart | null>(null);

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [activePolicyModal, setActivePolicyModal] = useState<string | null>(null);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | null>(null);
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string | null>(null);

  // Synchronized view navigation helper
  const navigateToView = (view: 'home' | 'catalog' | 'orders' | 'admin' | 'assistant') => {
    setCurrentView(view);
    const path = view === 'assistant' ? '/ai-assistant' : view === 'catalog' ? '/catalog' : view === 'orders' ? '/orders' : view === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial Load & Route Sync
  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {});
    api.getMe().then(setUser).catch(() => {});
    loadCart();
    api.getCategories().then(setCategories).catch(() => {});
    api.getProducts({ page: 1, limit: 8, sort_by: 'featured' }).then((res) => {
      setFeaturedProducts(res.products || []);
      setTotalProducts(res.total || 0);
    }).catch(() => {});

    // Route sync on page reload
    if (window.location.pathname === '/ai-assistant') {
      setCurrentView('assistant');
    } else if (window.location.pathname === '/orders') {
      setCurrentView('orders');
    } else if (window.location.pathname === '/catalog') {
      setCurrentView('catalog');
    }

    const handlePopState = () => {
      if (window.location.pathname === '/ai-assistant') {
        setCurrentView('assistant');
      } else if (window.location.pathname === '/orders') {
        setCurrentView('orders');
      } else if (window.location.pathname === '/catalog') {
        setCurrentView('catalog');
      } else {
        setCurrentView('home');
      }
    };
    window.addEventListener('popstate', handlePopState);

    // Preload department shelves for Home page areas
    api.getProducts({ department: 'fresh-groceries', limit: 8 }).then((res) => setSabjiProducts(res.products || [])).catch(() => {});
    api.getProducts({ department: 'clothing-shoes', limit: 8 }).then((res) => setClothingProducts(res.products || [])).catch(() => {});
    api.getProducts({ department: 'beverages-drinks', limit: 8 }).then((res) => setDrinksProducts(res.products || [])).catch(() => {});
    api.getProducts({ department: 'electronics', limit: 8 }).then((res) => setElectronicsProducts(res.products || [])).catch(() => {});
    api.getProducts({ department: 'organic-pantry', limit: 8 }).then((res) => setPantryProducts(res.products || [])).catch(() => {});

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    fetchCatalogProducts();
  }, [page, selectedDepartment, selectedCategory, maxPrice, isOrganicOnly, minRating, sortBy]);

  const fetchCatalogProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.getProducts({
        q: searchQuery || undefined,
        department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        max_price: maxPrice,
        is_organic: isOrganicOnly ? true : undefined,
        min_rating: minRating,
        sort_by: sortBy,
        page,
        limit: 12,
      });
      setProducts(res.products || []);
      setTotalProducts(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCart = async () => {
    try {
      const c = await api.getCart();
      setCart(c);
    } catch {
      setCart(null);
    }
  };

  const handleAddToCart = async (product: Product, quantity = 1) => {
    try {
      const updated = await api.addToCart(product.id, quantity, cart?.coupon_code);
      setCart(updated);
    } catch (err: any) {
      alert(err.message || 'Could not add to cart');
    }
  };

  const handleUpdateQuantity = async (itemId: number, newQty: number) => {
    try {
      if (newQty <= 0) {
        handleRemoveItem(itemId);
      } else {
        const updated = await api.updateCartItem(itemId, newQty, cart?.coupon_code);
        setCart(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update item quantity');
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      const updated = await api.removeCartItem(itemId, cart?.coupon_code);
      setCart(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to remove item');
    }
  };

  const handleApplyCoupon = async (code: string) => {
    const updated = await api.applyCoupon(code);
    setCart(updated);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    if (currentView === 'admin') setCurrentView('home');
  };

  const handleSearchSubmit = () => {
    setCurrentView('catalog');
    setPage(1);
    fetchCatalogProducts();
  };

  const handleSelectCategoryFromHero = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setCurrentView('catalog');
    setPage(1);
  };

  const handleAskAIAboutProduct = (product: Product) => {
    setAssistantInitialPrompt(
      `Can you give me detailed specifications, health benefits, and customer feedback on ${product.name}?`
    );
    navigateToView('assistant');
  };

  const handleOrderSuccess = (_order: Order) => {
    loadCart();
  };

  const handleViewOrderTracking = (orderNumber: string) => {
    setTrackingOrderNumber(orderNumber);
    setCurrentView('orders');
  };

  const handleSelectDepartment = (deptId: string) => {
    setSelectedDepartment(deptId);
    setSelectedCategory('all');
    setPage(1);
    setCurrentView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDepartmentSubFilter = (deptId: string, subCategory: string) => {
    setSelectedDepartment(deptId);
    setSelectedCategory(subCategory);
    setPage(1);
    setCurrentView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cartItemCount = cart?.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;
  const currencySymbol = config?.currency_symbol || '₹';

  // Department metadata for catalog and home shelves
  const DEPARTMENT_CONFIG: Record<string, {
    title: string;
    subtitle: string;
    icon: string;
    badge: string;
    subcategories: { id: string; name: string }[];
  }> = {
    'fresh-groceries': {
      title: 'Fresh Sabji & Daily Groceries',
      subtitle: 'Harvested daily from verified organic farms: Tomatoes, Palak, Aloo, Pyaaz, Green Peas, Cucumbers, Methi, Kale, Cauliflower & Orchard Fruits (24 items)',
      icon: '🥦',
      badge: 'Farm Fresh (24 items)',
      subcategories: [
        { id: 'all', name: 'All Fresh Sabji (24)' },
        { id: 'sabji', name: 'Vegetables & Sabji (Aloo, Tamatar, Bhindi, Gobi)' },
        { id: 'greens', name: 'Herbs & Leafy Greens (Palak, Methi, Kale, Mint)' },
        { id: 'fruits', name: 'Orchard Fruits (Mangoes, Apples, Grapes, Pomegranate)' },
      ],
    },
    'clothing-shoes': {
      title: 'Clothing & Footwear Collection',
      subtitle: 'Everyday wardrobe essentials: Breathable linen shirts, oxford button-downs, stretch chinos, denim jeans, sneakers, boots & slides (24 items)',
      icon: '👟',
      badge: 'Apparel & Shoes (24 items)',
      subcategories: [
        { id: 'all', name: 'All Clothing & Footwear (24)' },
        { id: 'shoes', name: 'Footwear (Sneakers, Loafers, Boots, Slides)' },
        { id: 'shirts', name: 'Shirts & Polos (Linen, Oxford, Flannel)' },
        { id: 'pants', name: 'Pants & Trousers (Chinos, Jeans, Joggers, Shorts)' },
        { id: 't-shirts', name: 'T-Shirts, Hoodies & Jackets' },
      ],
    },
    'beverages-drinks': {
      title: 'Chilled Drinks & Artisanal Beverages',
      subtitle: 'Pure cold-pressed juices, tender coconut water, nitro cold brews, ceremonial matcha, craft sodas & elixirs (22 items)',
      icon: '🧃',
      badge: 'Chilled & Natural (22 items)',
      subcategories: [
        { id: 'all', name: 'All Drinks (22)' },
        { id: 'juices', name: 'Cold-Pressed Juices, Coconut Water & Smoothies' },
        { id: 'coffee-tea', name: 'Cold Brew, Matcha, Chai & Iced Tea' },
        { id: 'sodas-kombucha', name: 'Craft Sodas, Kombucha & Mineral Waters' },
      ],
    },
    'electronics': {
      title: 'Electronics & Smart Everyday Tech',
      subtitle: 'Pro active noise cancelling earbuds, fitness smartwatches, studio Bluetooth headphones, 65W GaN fast chargers, keyboards & desk tech (22 items)',
      icon: '⚡',
      badge: 'Smart Tech (22 items)',
      subcategories: [
        { id: 'all', name: 'All Electronics (22)' },
        { id: 'audio', name: 'Audio (ANC Earbuds, Headphones, Speakers, Mics)' },
        { id: 'watch', name: 'Smartwatches & Fitness Bands' },
        { id: 'chargers', name: 'GaN Fast Chargers, Power Banks & Cables' },
        { id: 'workstation', name: 'Workstation Tech (Keyboards, Mice, Webcams, Lamps)' },
      ],
    },
    'organic-pantry': {
      title: 'Certified Organic Farm Pantry',
      subtitle: 'Raw wild honey, wood cold-pressed oils, activated nuts, seeds & whole heritage grains (32 items)',
      icon: '🍯',
      badge: '100% Certified Organic (32 items)',
      subcategories: [
        { id: 'all', name: 'All Pantry (32)' },
        { id: 'honey', name: 'Raw Wild Honey (8)' },
        { id: 'oil', name: 'Cold-Pressed Oils (4)' },
        { id: 'nuts', name: 'Almonds, Cashews & Nuts (3)' },
        { id: 'grains', name: 'Whole Heritage Grains & Oats (4)' },
      ],
    },
    'all': {
      title: 'All Departments Storefront',
      subtitle: 'Explore 124 products across Fresh Sabji, Apparel & Shoes, Chilled Drinks, Electronics, and Organic Pantry',
      icon: '✨',
      badge: '124 Products',
      subcategories: [
        { id: 'all', name: 'All 124 Products' },
        { id: 'fresh-groceries', name: '🥦 Fresh Sabji & Groceries (24)' },
        { id: 'clothing-shoes', name: '👕 Clothing & Footwear (24)' },
        { id: 'beverages-drinks', name: '🧃 Drinks & Beverages (22)' },
        { id: 'electronics', name: '⚡ Electronics & Gadgets (22)' },
        { id: 'organic-pantry', name: '🍯 Organic Pantry (32)' },
      ],
    },
  };

  // Department display cards on home
  const departmentCards = [
    { name: 'Fresh Sabji & Groceries', slug: 'fresh-groceries', desc: 'Tomatoes, Palak, Aloo, Pyaaz, Methi & Fruits', emoji: '🥦', badge: '24 items' },
    { name: 'Clothing & Footwear', slug: 'clothing-shoes', desc: 'Shirts, Pants, Jeans, Sneakers & Boots', emoji: '👕', badge: '24 items' },
    { name: 'Drinks & Beverages', slug: 'beverages-drinks', desc: 'Fresh Juices, Coconut Water, Cold Brew & Kombucha', emoji: '🧃', badge: '22 items' },
    { name: 'Electronics & Tech', slug: 'electronics', desc: 'ANC Earbuds, Smartwatches, Keyboards & Chargers', emoji: '⚡', badge: '22 items' },
    { name: 'Organic Pantry', slug: 'organic-pantry', desc: 'Raw Honey, Cold-Pressed Oils, Grains & Nuts', emoji: '🍯', badge: '32 items' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* Announcement Bar */}
      {currentView !== 'assistant' && (
        <div className="announcement-bar">
          Use code <strong>WELCOME10</strong> for 10% off your first order · Free shipping on orders over ₹999
        </div>
      )}

      {/* Navigation */}
      {currentView !== 'assistant' && (
        <Navbar
          cartItemCount={cartItemCount}
          user={user}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAIAssistant={() => navigateToView('assistant')}
          onOpenVisualSearch={() => setIsVisualSearchOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onLogout={handleLogout}
          onNavigate={navigateToView}
          currentView={currentView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          selectedDepartment={selectedDepartment}
          onSelectDepartment={handleSelectDepartment}
        />
      )}

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* ===== VIEW: HOME ===== */}
        {currentView === 'home' && (
          <div>
            <Hero
              onExploreCatalog={() => navigateToView('catalog')}
              onOpenAIAssistant={() => navigateToView('assistant')}
              onOpenVisualSearch={() => setIsVisualSearchOpen(true)}
              onSelectCategory={handleSelectCategoryFromHero}
            />

            {/* Shop by Department section */}
            <section style={{ padding: '3rem 0', borderBottom: '1px solid var(--border-light)' }}>
              <div className="container mx-auto">
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      Shop by Department
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Explore dedicated areas for farm-fresh groceries, everyday fashion, drinks, electronics, and pantry
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectDepartment('all')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.8125rem', fontWeight: 500,
                      color: 'var(--green-500)',
                      background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    All departments
                    <ChevronRight style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '0.875rem',
                }}>
                  {departmentCards.map((dept) => (
                    <button
                      key={dept.slug}
                      onClick={() => handleSelectDepartment(dept.slug)}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '14px',
                        padding: '1.25rem 1rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: '0 2px 8px rgba(28, 42, 20, 0.04)',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--green-400)';
                        e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(46, 94, 28, 0.12)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.background = '#f9fcf7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-light)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(28, 42, 20, 0.04)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.background = 'var(--bg-surface)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{
                          fontSize: '1.625rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: '#f4f0e6',
                        }}>
                          {dept.emoji}
                        </span>
                        <span style={{
                          fontSize: '0.625rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          background: '#f0f6ea',
                          color: 'var(--green-700)',
                          fontWeight: 600,
                          border: '1px solid #d9ebca',
                        }}>
                          {dept.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                        {dept.name}
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {dept.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Featured products */}
            <section style={{ padding: '3rem 0', borderBottom: '1px solid var(--border-light)' }}>
              <div className="container mx-auto">
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green-500)', marginBottom: '0.375rem' }}>
                      Best Sellers
                    </p>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      Featured Essentials
                    </h2>
                  </div>
                  <button
                    onClick={() => handleSelectDepartment('all')}
                    style={{
                      fontSize: '0.8125rem', fontWeight: 500,
                      color: 'var(--green-500)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                    }}
                  >
                    View all {totalProducts > 0 ? `(${totalProducts})` : ''}
                    <ChevronRight style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1.125rem',
                }}>
                  {featuredProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      currencySymbol={currencySymbol}
                      onAddToCart={(p) => handleAddToCart(p, 1)}
                      onViewDetails={setSelectedProductForModal}
                      onAskAIAboutProduct={handleAskAIAboutProduct}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* AREA 1: Fresh Sabji & Daily Groceries */}
            <section style={{ padding: '3rem 0', borderBottom: '1px solid var(--border-light)', background: '#fafcfa' }}>
              <div className="container mx-auto">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.2rem 0.5rem', background: 'var(--green-100)', color: 'var(--green-700)', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      🥦 Farm Fresh Daily
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      Fresh Sabji & Daily Groceries
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Vine-ripened tomatoes, fresh baby spinach (palak), golden potatoes, onions, carrots & orchard fruits
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { label: 'All Sabji', cat: 'all' },
                      { label: 'Vegetables', cat: 'sabji' },
                      { label: 'Greens & Herbs', cat: 'greens' },
                      { label: 'Fresh Fruits', cat: 'fruits' },
                    ].map((f) => (
                      <button
                        key={f.label}
                        onClick={() => handleDepartmentSubFilter('fresh-groceries', f.cat)}
                        style={{
                          padding: '0.25rem 0.625rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          borderRadius: '9999px',
                          border: '1px solid var(--border-light)',
                          background: '#fff',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                    <button
                      onClick={() => handleSelectDepartment('fresh-groceries')}
                      style={{
                        fontSize: '0.8125rem', fontWeight: 600,
                        color: 'var(--green-600)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        marginLeft: '0.5rem',
                      }}
                    >
                      View All (12)
                      <ChevronRight style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1.125rem',
                }}>
                  {sabjiProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      currencySymbol={currencySymbol}
                      onAddToCart={(p) => handleAddToCart(p, 1)}
                      onViewDetails={setSelectedProductForModal}
                      onAskAIAboutProduct={handleAskAIAboutProduct}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* AREA 2: Clothing & Footwear */}
            <section style={{ padding: '3rem 0', borderBottom: '1px solid var(--border-light)', background: '#ffffff' }}>
              <div className="container mx-auto">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.2rem 0.5rem', background: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      👕 Apparel & Shoes
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      Clothing & Footwear Collection
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Linen button-downs, crisp oxford shirts, stretch chinos, denim jeans, sneakers, and leather loafers
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { label: 'All Apparel', cat: 'all' },
                      { label: 'Shoes & Sneakers', cat: 'shoes' },
                      { label: 'Shirts', cat: 'shirts' },
                      { label: 'Pants & Jeans', cat: 'pants' },
                      { label: 'T-Shirts', cat: 't-shirts' },
                    ].map((f) => (
                      <button
                        key={f.label}
                        onClick={() => handleDepartmentSubFilter('clothing-shoes', f.cat)}
                        style={{
                          padding: '0.25rem 0.625rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          borderRadius: '9999px',
                          border: '1px solid var(--border-light)',
                          background: '#fff',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                    <button
                      onClick={() => handleSelectDepartment('clothing-shoes')}
                      style={{
                        fontSize: '0.8125rem', fontWeight: 600,
                        color: 'var(--green-600)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        marginLeft: '0.5rem',
                      }}
                    >
                      View All (10)
                      <ChevronRight style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1.125rem',
                }}>
                  {clothingProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      currencySymbol={currencySymbol}
                      onAddToCart={(p) => handleAddToCart(p, 1)}
                      onViewDetails={setSelectedProductForModal}
                      onAskAIAboutProduct={handleAskAIAboutProduct}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* AREA 3: Drinks & Beverages */}
            <section style={{ padding: '3rem 0', borderBottom: '1px solid var(--border-light)', background: '#fdfbf7' }}>
              <div className="container mx-auto">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.2rem 0.5rem', background: '#fef3c7', color: '#b45309', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      🧃 Chilled & Natural
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      Chilled Drinks & Artisanal Beverages
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Cold-pressed pure orange juice, tender coconut water, nitro cold brew, matcha, craft sodas & mineral water
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { label: 'All Drinks', cat: 'all' },
                      { label: 'Pure Juices', cat: 'juices' },
                      { label: 'Cold Brew & Matcha', cat: 'coffee-tea' },
                      { label: 'Craft Sodas', cat: 'sodas-kombucha' },
                    ].map((f) => (
                      <button
                        key={f.label}
                        onClick={() => handleDepartmentSubFilter('beverages-drinks', f.cat)}
                        style={{
                          padding: '0.25rem 0.625rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          borderRadius: '9999px',
                          border: '1px solid var(--border-light)',
                          background: '#fff',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                    <button
                      onClick={() => handleSelectDepartment('beverages-drinks')}
                      style={{
                        fontSize: '0.8125rem', fontWeight: 600,
                        color: 'var(--green-600)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        marginLeft: '0.5rem',
                      }}
                    >
                      View All (16)
                      <ChevronRight style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1.125rem',
                }}>
                  {drinksProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      currencySymbol={currencySymbol}
                      onAddToCart={(p) => handleAddToCart(p, 1)}
                      onViewDetails={setSelectedProductForModal}
                      onAskAIAboutProduct={handleAskAIAboutProduct}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* AREA 4: Electronics & Everyday Tech */}
            <section style={{ padding: '3rem 0', borderBottom: '1px solid var(--border-light)', background: '#ffffff' }}>
              <div className="container mx-auto">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.2rem 0.5rem', background: '#f3e8ff', color: '#7e22ce', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      ⚡ Smart Tech & Sound
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      Electronics & Everyday Smart Tech
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Pro ANC earbuds, smart health watches, studio Bluetooth headphones, 65W GaN fast chargers & portable speakers
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { label: 'All Tech', cat: 'all' },
                      { label: 'Audio & Earbuds', cat: 'audio' },
                      { label: 'Smartwatches', cat: 'watch' },
                      { label: 'Chargers & Power', cat: 'chargers' },
                    ].map((f) => (
                      <button
                        key={f.label}
                        onClick={() => handleDepartmentSubFilter('electronics', f.cat)}
                        style={{
                          padding: '0.25rem 0.625rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          borderRadius: '9999px',
                          border: '1px solid var(--border-light)',
                          background: '#fff',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                    <button
                      onClick={() => handleSelectDepartment('electronics')}
                      style={{
                        fontSize: '0.8125rem', fontWeight: 600,
                        color: 'var(--green-600)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        marginLeft: '0.5rem',
                      }}
                    >
                      View All (8)
                      <ChevronRight style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1.125rem',
                }}>
                  {electronicsProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      currencySymbol={currencySymbol}
                      onAddToCart={(p) => handleAddToCart(p, 1)}
                      onViewDetails={setSelectedProductForModal}
                      onAskAIAboutProduct={handleAskAIAboutProduct}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* AREA 5: Organic Farm Pantry */}
            <section style={{ padding: '3rem 0', borderBottom: '1px solid var(--border-light)', background: '#fbfcf9' }}>
              <div className="container mx-auto">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.2rem 0.5rem', background: 'var(--green-100)', color: 'var(--green-700)', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      🍯 100% Certified Organic
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      Certified Organic Farm Pantry
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Raw wild honey, wood cold-pressed oils, activated nuts, seeds & whole heritage grains
                    </p>
                  </div>

                  <button
                    onClick={() => handleSelectDepartment('organic-pantry')}
                    style={{
                      fontSize: '0.8125rem', fontWeight: 600,
                      color: 'var(--green-600)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                    }}
                  >
                    View All Pantry (32)
                    <ChevronRight style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1.125rem',
                }}>
                  {pantryProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      currencySymbol={currencySymbol}
                      onAddToCart={(p) => handleAddToCart(p, 1)}
                      onViewDetails={setSelectedProductForModal}
                      onAskAIAboutProduct={handleAskAIAboutProduct}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* AI assistant CTA banner */}
            <section style={{
              padding: '3.75rem 0',
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(20, 34, 16, 0.94) 0%, rgba(27, 44, 22, 0.92) 100%), url("/agent-bg.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              overflow: 'hidden',
            }}>
              <div className="container mx-auto" style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
                <div style={{ maxWidth: '560px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    background: 'rgba(217, 235, 202, 0.15)',
                    border: '1px solid rgba(217, 235, 202, 0.25)',
                    marginBottom: '0.75rem',
                  }}>
                    <Sparkles style={{ width: '12px', height: '12px', color: 'var(--green-300)' }} />
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green-300)' }}>
                      AI Shopping Guide
                    </span>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.625rem', fontWeight: 600, color: 'var(--text-on-dark)', lineHeight: 1.25, marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
                    Not sure what to buy? Our AI guides you.
                  </h3>
                  <p style={{ fontSize: '0.9375rem', color: '#c4d4b8', lineHeight: 1.7 }}>
                    Compare honey varieties, check oil smoke points, find the right grain for your diet, or build a gift basket — ask anything.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigateToView('assistant')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #3d7a28 0%, #2e5e1c 100%)',
                      color: '#fff',
                      border: '1px solid #4a8e32',
                      borderRadius: '8px',
                      fontSize: '0.875rem', fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
                    }}
                  >
                    <Sparkles style={{ width: '15px', height: '15px' }} />
                    Start AI Chat
                  </button>
                  <button
                    onClick={() => setIsVisualSearchOpen(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.75rem 1.35rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: '8px',
                      fontSize: '0.875rem', fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                    }}
                  >
                    <Camera style={{ width: '15px', height: '15px' }} />
                    Visual Search
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ===== VIEW: CATALOG ===== */}
        {currentView === 'catalog' && (
          <div style={{ background: 'var(--bg-page)', padding: '2rem 0' }}>
            <div className="container mx-auto">

              {/* Department Spotlight Header */}
              {(() => {
                const activeDept = DEPARTMENT_CONFIG[selectedDepartment] || DEPARTMENT_CONFIG['all'];
                return (
                  <div style={{ marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{activeDept.icon}</span>
                      <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.75rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                      }}>
                        {activeDept.title}
                      </h1>
                      <span style={{
                        fontSize: '0.6875rem',
                        padding: '0.15rem 0.5rem',
                        background: 'var(--green-100)',
                        color: 'var(--green-700)',
                        borderRadius: '9999px',
                        fontWeight: 600,
                        marginLeft: '0.25rem',
                      }}>
                        {activeDept.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '640px', lineHeight: 1.5 }}>
                      {activeDept.subtitle}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--green-600)', fontWeight: 500, marginTop: '0.375rem' }}>
                      {products.length > 0
                        ? `Showing ${products.length} of ${totalProducts} products in this department`
                        : `${totalProducts} items available`
                      }
                    </p>
                  </div>
                );
              })()}

              {/* Filters + Sort row */}
              <div style={{
                display: 'flex', flexWrap: 'wrap',
                alignItems: 'center', justifyContent: 'space-between',
                gap: '0.75rem', marginBottom: '1.25rem',
              }}>

                {/* Tailored Department subcategory tabs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', overflowX: 'auto', paddingBottom: '2px', flex: 1 }}>
                  {(() => {
                    const activeDept = DEPARTMENT_CONFIG[selectedDepartment] || DEPARTMENT_CONFIG['all'];
                    return activeDept.subcategories.map((subcat) => {
                      const isActive = selectedCategory === subcat.id;
                      return (
                        <button
                          key={subcat.id}
                          onClick={() => {
                            if (selectedDepartment === 'all' && subcat.id !== 'all') {
                              setSelectedDepartment(subcat.id);
                              setSelectedCategory('all');
                            } else {
                              setSelectedCategory(subcat.id);
                            }
                            setPage(1);
                          }}
                          style={{
                            padding: '0.35rem 0.875rem',
                            fontSize: '0.8125rem',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? 'var(--green-700)' : 'var(--text-muted)',
                            background: isActive ? 'var(--green-100)' : 'transparent',
                            border: '1px solid',
                            borderColor: isActive ? 'var(--green-300)' : 'var(--border-light)',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s',
                            flexShrink: 0,
                          }}
                        >
                          {subcat.name}
                        </button>
                      );
                    });
                  })()}
                </div>

                {/* Right side: filters toggle + sort */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                  <button
                    onClick={() => setShowFilters(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8125rem', fontWeight: 500,
                      color: showFilters ? 'var(--green-600)' : 'var(--text-muted)',
                      background: showFilters ? 'var(--green-50)' : 'transparent',
                      border: '1px solid',
                      borderColor: showFilters ? 'var(--green-300)' : 'var(--border-light)',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <SlidersHorizontal style={{ width: '13px', height: '13px' }} />
                    Filters
                  </button>

                  <button
                    onClick={() => setIsVisualSearchOpen(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8125rem', fontWeight: 400,
                      color: 'var(--text-muted)',
                      background: 'transparent',
                      border: '1px solid var(--border-light)',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Camera style={{ width: '13px', height: '13px' }} />
                    <span className="hidden sm:inline">Visual Search</span>
                  </button>

                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                    style={{
                      padding: '0.35rem 0.625rem',
                      fontSize: '0.8125rem',
                      fontWeight: 400,
                      color: 'var(--text-primary)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '5px',
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'auto',
                    }}
                  >
                    <option value="featured">Featured</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating_desc">Highest Rated</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>
              </div>

              {/* Expandable filter panel */}
              {showFilters && (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  alignItems: 'center',
                }}>
                  {/* Organic toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isOrganicOnly}
                      onChange={(e) => { setIsOrganicOnly(e.target.checked); setPage(1); }}
                      style={{ accentColor: 'var(--green-500)', width: '14px', height: '14px' }}
                    />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      Certified Organic only
                    </span>
                  </label>

                  {/* Rating filter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Min. rating:</span>
                    {[{ label: 'All', val: undefined }, { label: '4★+', val: 4 }, { label: '4.5★+', val: 4.5 }].map((r) => (
                      <button
                        key={r.label}
                        onClick={() => { setMinRating(r.val); setPage(1); }}
                        style={{
                          padding: '0.25rem 0.625rem',
                          fontSize: '0.75rem', fontWeight: 500,
                          color: minRating === r.val ? 'var(--amber-500)' : 'var(--text-muted)',
                          background: minRating === r.val ? 'rgba(212,168,67,0.1)' : 'transparent',
                          border: '1px solid',
                          borderColor: minRating === r.val ? 'var(--amber-400)' : 'var(--border-light)',
                          borderRadius: '4px', cursor: 'pointer',
                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {/* Price filter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Budget:</span>
                    {[
                      { label: 'Any', max: undefined },
                      { label: 'Under ₹200', max: 200 },
                      { label: 'Under ₹500', max: 500 },
                      { label: 'Under ₹1,000', max: 1000 },
                    ].map((b) => (
                      <button
                        key={b.label}
                        onClick={() => { setMaxPrice(b.max); setPage(1); }}
                        style={{
                          padding: '0.25rem 0.625rem',
                          fontSize: '0.75rem', fontWeight: 500,
                          color: maxPrice === b.max ? 'var(--green-600)' : 'var(--text-muted)',
                          background: maxPrice === b.max ? 'var(--green-50)' : 'transparent',
                          border: '1px solid',
                          borderColor: maxPrice === b.max ? 'var(--green-300)' : 'var(--border-light)',
                          borderRadius: '4px', cursor: 'pointer',
                        }}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  {/* Clear filters */}
                  {(isOrganicOnly || minRating !== undefined || maxPrice !== undefined) && (
                    <button
                      onClick={() => {
                        setIsOrganicOnly(false);
                        setMinRating(undefined);
                        setMaxPrice(undefined);
                        setPage(1);
                      }}
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.75rem', fontWeight: 500,
                        color: 'var(--text-muted)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {/* Products grid */}
              {loadingProducts ? (
                <div style={{ padding: '5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <RefreshCw style={{ width: '24px', height: '24px', color: 'var(--green-400)', animation: 'spin 1s linear infinite' }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading products…</p>
                </div>
              ) : products.length === 0 ? (
                <div style={{ padding: '5rem 0', textAlign: 'center', maxWidth: '380px', margin: '0 auto' }}>
                  <ShoppingBag style={{ width: '36px', height: '36px', color: 'var(--text-light)', margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    No products match
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Try adjusting your filters or search query.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                        setMaxPrice(undefined);
                        setIsOrganicOnly(false);
                        setMinRating(undefined);
                        setPage(1);
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      Show all {selectedDepartment !== 'all' ? DEPARTMENT_CONFIG[selectedDepartment]?.title || 'items' : '124 products'}
                    </button>
                    {selectedDepartment !== 'all' && (
                      <button
                        onClick={() => {
                          setSelectedDepartment('all');
                          setSelectedCategory('all');
                          setSearchQuery('');
                          setMaxPrice(undefined);
                          setIsOrganicOnly(false);
                          setMinRating(undefined);
                          setPage(1);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        Browse all departments
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '1.125rem',
                    marginBottom: '2.5rem',
                  }}>
                    {products.map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        currencySymbol={currencySymbol}
                        onAddToCart={(p) => handleAddToCart(p, 1)}
                        onViewDetails={setSelectedProductForModal}
                        onAskAIAboutProduct={handleAskAIAboutProduct}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem' }}>
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="btn btn-secondary btn-sm"
                        style={{ opacity: page <= 1 ? 0.4 : 1 }}
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '0 0.5rem' }}>
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="btn btn-secondary btn-sm"
                        style={{ opacity: page >= totalPages ? 0.4 : 1 }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== VIEW: ORDERS ===== */}
        {currentView === 'orders' && (
          <OrderTrackingView
            user={user}
            currencySymbol={currencySymbol}
            initialOrderNumber={trackingOrderNumber}
            onBackToStore={() => navigateToView('catalog')}
          />
        )}

        {/* ===== VIEW: ADMIN ===== */}
        {currentView === 'admin' && (
          <AdminDashboard
            currencySymbol={currencySymbol}
            onBackToStore={() => navigateToView('catalog')}
          />
        )}

        {/* ===== VIEW: ASSISTANT ===== */}
        {currentView === 'assistant' && (
          <FullScreenAIAssistant
            user={user}
            currencySymbol={currencySymbol}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateCartQuantity={handleUpdateQuantity}
            onRemoveCartItem={handleRemoveItem}
            onSelectProduct={setSelectedProductForModal}
            onProceedToCheckout={() => setIsCheckoutOpen(true)}
            onBackToStore={() => navigateToView('home')}
            onNavigateToCatalog={() => navigateToView('catalog')}
            onNavigateToOrders={() => navigateToView('orders')}
            onRefreshCart={loadCart}
            initialPrompt={assistantInitialPrompt}
            onClearInitialPrompt={() => setAssistantInitialPrompt(null)}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <ProductModal
        product={selectedProductForModal}
        currencySymbol={currencySymbol}
        onClose={() => setSelectedProductForModal(null)}
        onAddToCart={(p, q) => handleAddToCart(p, q)}
        onBuyNow={(p, q) => {
          handleAddToCart(p, q);
          setSelectedProductForModal(null);
          setIsCheckoutOpen(true);
        }}
        onAskAI={(prompt) => {
          setSelectedProductForModal(null);
          setAssistantInitialPrompt(prompt);
          navigateToView('assistant');
        }}
        onReviewAdded={(productId, newAvg, newCount) => {
          const updateProduct = (p: Product) => p.id === productId ? { ...p, average_rating: newAvg, review_count: newCount } : p;
          setProducts(prev => prev.map(updateProduct));
          setFeaturedProducts(prev => prev.map(updateProduct));
          setSabjiProducts(prev => prev.map(updateProduct));
          setClothingProducts(prev => prev.map(updateProduct));
          setDrinksProducts(prev => prev.map(updateProduct));
          setElectronicsProducts(prev => prev.map(updateProduct));
          setPantryProducts(prev => prev.map(updateProduct));
          if (selectedProductForModal?.id === productId) {
            setSelectedProductForModal(prev => prev ? { ...prev, average_rating: newAvg, review_count: newCount } : null);
          }
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        cart={cart}
        currencySymbol={currencySymbol}
        freeShippingThreshold={config?.free_shipping_threshold || 999}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onApplyCoupon={handleApplyCoupon}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
        onExploreCatalog={() => navigateToView('catalog')}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        cart={cart}
        user={user}
        currencySymbol={currencySymbol}
        freeShippingThreshold={config?.free_shipping_threshold || 999}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
        onViewOrderTracking={handleViewOrderTracking}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(u) => {
          setUser(u);
          loadCart();
        }}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={(u) => setUser(u)}
        onLogout={handleLogout}
        onTrackOrder={(orderNumber) => {
          setTrackingOrderNumber(orderNumber);
          navigateToView('orders');
        }}
        currencySymbol={currencySymbol}
      />

      <VisualSearchModal
        isOpen={isVisualSearchOpen}
        currencySymbol={currencySymbol}
        onClose={() => setIsVisualSearchOpen(false)}
        onSelectProduct={(p) => setSelectedProductForModal(p)}
        onAddToCart={(p) => handleAddToCart(p, 1)}
      />

      <PolicyModal
        policy={activePolicyModal}
        onClose={() => setActivePolicyModal(null)}
      />

      {currentView !== 'assistant' && (
        <Footer
          onNavigate={navigateToView}
          onOpenPolicy={setActivePolicyModal}
          onOpenAIAssistant={() => navigateToView('assistant')}
        />
      )}
    </div>
  );
}

export default App;
