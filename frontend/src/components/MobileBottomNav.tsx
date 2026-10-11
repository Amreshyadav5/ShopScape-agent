import { Home, LayoutGrid, Sparkles, User as UserIcon, ShoppingBag } from 'lucide-react';
import type { User } from '../types';

interface MobileBottomNavProps {
  currentView: 'home' | 'catalog' | 'orders' | 'admin' | 'assistant';
  onNavigate: (view: 'home' | 'catalog' | 'orders' | 'admin' | 'assistant') => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenProfile: () => void;
  user: User | null;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  cartCount,
  onOpenCart,
  onOpenProfile,
  user,
}) => {
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      action: () => onNavigate('home'),
      isActive: currentView === 'home',
    },
    {
      id: 'catalog',
      label: 'Explore',
      icon: LayoutGrid,
      action: () => onNavigate('catalog'),
      isActive: currentView === 'catalog',
    },
    {
      id: 'assistant',
      label: 'AI Guide',
      icon: Sparkles,
      action: () => onNavigate('assistant'),
      isActive: currentView === 'assistant',
      isSpecial: true,
    },
    {
      id: 'cart',
      label: 'Bag',
      icon: ShoppingBag,
      action: onOpenCart,
      isActive: false,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      id: 'profile',
      label: user ? 'Account' : 'Sign In',
      icon: UserIcon,
      action: onOpenProfile,
      isActive: false,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(232, 223, 209, 0.85)',
        boxShadow: '0 -4px 16px rgba(28, 42, 20, 0.06)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
        paddingTop: '6px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        maxWidth: '540px',
        margin: '0 auto',
        padding: '0 0.5rem',
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isActive;

          return (
            <button
              key={tab.id}
              onClick={tab.action}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                position: 'relative',
                flex: 1,
                minWidth: '56px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Icon Container */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: tab.isSpecial ? '34px' : '28px',
                height: tab.isSpecial ? '34px' : '28px',
                borderRadius: tab.isSpecial ? '10px' : '6px',
                background: tab.isSpecial 
                  ? 'linear-gradient(135deg, var(--green-600, #2e5e1c) 0%, var(--green-400, #5a9e3a) 100%)' 
                  : (active ? 'var(--green-50, #f0f5ea)' : 'transparent'),
                color: tab.isSpecial 
                  ? '#ffffff' 
                  : (active ? 'var(--green-600, #2e5e1c)' : 'var(--text-muted, #7a7060)'),
                boxShadow: tab.isSpecial ? '0 2px 8px rgba(46, 94, 28, 0.35)' : 'none',
                transition: 'all 0.18s ease',
              }}>
                <Icon style={{ width: tab.isSpecial ? '17px' : '19px', height: tab.isSpecial ? '17px' : '19px' }} />

                {/* Badge (Cart Count) */}
                {tab.badge !== undefined && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-6px',
                    minWidth: '17px',
                    height: '17px',
                    padding: '0 4px',
                    borderRadius: '999px',
                    background: 'var(--green-500, #3d7a28)',
                    color: '#ffffff',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    border: '1.5px solid #ffffff',
                  }}>
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: active || tab.isSpecial ? 600 : 500,
                color: tab.isSpecial
                  ? 'var(--green-700, #1f4212)'
                  : (active ? 'var(--green-600, #2e5e1c)' : 'var(--text-muted, #7a7060)'),
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
                marginTop: '1px',
              }}>
                {tab.label}
              </span>

              {/* Active Dot indicator (Flipkart/Myntra style) */}
              {active && !tab.isSpecial && (
                <span style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: 'var(--green-600, #2e5e1c)',
                  marginTop: '1px',
                }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
