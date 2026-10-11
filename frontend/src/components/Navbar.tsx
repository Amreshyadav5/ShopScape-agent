import React from 'react';
import { ShoppingBag, Sparkles, Search, Camera, User, LogOut, Shield } from 'lucide-react';
import type { User as UserType } from '../types';

export const DEPARTMENTS = [
  { id: 'all', name: 'All Store', icon: '✨', badge: '70 items' },
  { id: 'fresh-groceries', name: 'Fresh Sabji & Groceries', icon: '🥦', badge: 'Farm Fresh' },
  { id: 'clothing-shoes', name: 'Clothing & Footwear', icon: '👕', badge: 'Apparel' },
  { id: 'beverages-drinks', name: 'Drinks & Beverages', icon: '🧃', badge: 'Chilled' },
  { id: 'electronics', name: 'Electronics & Gadgets', icon: '⚡', badge: 'Smart' },
  { id: 'organic-pantry', name: 'Organic Pantry', icon: '🍯', badge: 'Pantry' },
];

interface NavbarProps {
  cartItemCount: number;
  user: UserType | null;
  onOpenCart: () => void;
  onOpenAIAssistant: () => void;
  onOpenVisualSearch: () => void;
  onOpenAuth: () => void;
  onOpenProfile?: () => void;
  onLogout: () => void;
  onNavigate: (view: 'home' | 'catalog' | 'orders' | 'admin' | 'assistant') => void;
  currentView: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  selectedDepartment?: string;
  onSelectDepartment?: (deptId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartItemCount,
  user,
  onOpenCart,
  onOpenAIAssistant,
  onOpenVisualSearch,
  onOpenAuth,
  onOpenProfile,
  onLogout,
  onNavigate,
  currentView,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  selectedDepartment = 'all',
  onSelectDepartment,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearchSubmit();
  };

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid var(--border-light)',
        boxShadow: '0 1px 0 var(--border-light)',
      }}
    >
      <div className="container mx-auto">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', height: '58px' }}>

          {/* Brand wordmark */}
          <div
            onClick={() => onNavigate('home')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{
              width: '32px', height: '32px',
              background: 'var(--green-500)',
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingBag style={{ width: '16px', height: '16px', color: '#fff' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '1.1875rem',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                }}>
                  ShopScape
                </span>
                <span style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--green-500)',
                  fontFamily: 'var(--font-body)',
                }}>
                  Organic
                </span>
              </div>
            </div>
          </div>

          {/* Search bar — desktop */}
          <div className="hidden md:block" style={{ flex: 1, maxWidth: '440px' }}
            suppressHydrationWarning
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search style={{
                position: 'absolute', left: '0.75rem',
                width: '15px', height: '15px',
                color: 'var(--text-light)', pointerEvents: 'none'
              }} />
              <input
                type="text"
                placeholder="Search sabji, shirts, shoes, drinks, electronics, pantry…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  paddingLeft: '2.25rem',
                  paddingRight: '5rem',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--green-400)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(90,158,58,0.1)';
                  e.target.style.background = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-light)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = 'var(--bg-muted)';
                }}
              />
              <div style={{ position: 'absolute', right: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
                <button
                  type="button"
                  onClick={onOpenVisualSearch}
                  title="Visual search"
                  style={{
                    padding: '0.3rem',
                    color: 'var(--text-light)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green-500)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-light)')}
                >
                  <Camera style={{ width: '14px', height: '14px' }} />
                </button>
                <button
                  type="button"
                  onClick={onSearchSubmit}
                  style={{
                    padding: '0.3rem 0.625rem',
                    background: 'var(--green-500)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--green-600)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--green-500)')}
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Nav links — desktop only (screens >= 900px) */}
          <nav className="navbar-nav-links">
            {[
              { id: 'home', label: 'Home' },
              { id: 'catalog', label: 'Shop' },
              { id: 'orders', label: 'Orders' },
              { id: 'assistant', label: 'AI Assistant', badge: 'GPT' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as any)}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  fontWeight: currentView === item.id ? 600 : 400,
                  color: currentView === item.id ? 'var(--green-500)' : 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'color 0.15s, background 0.15s',
                  borderBottom: currentView === item.id ? '2px solid var(--green-500)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (currentView !== item.id) e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { if (currentView !== item.id) e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                {item.label}
                {item.badge && (
                  <span style={{
                    fontSize: '0.5625rem',
                    fontWeight: 700,
                    padding: '0.05rem 0.35rem',
                    borderRadius: '4px',
                    background: 'var(--green-100)',
                    color: 'var(--green-700)',
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
            {user?.role === 'admin' && (
              <button
                onClick={() => onNavigate('admin')}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  fontWeight: currentView === 'admin' ? 600 : 400,
                  color: currentView === 'admin' ? 'var(--amber-500)' : 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  transition: 'color 0.15s',
                }}
              >
                <Shield style={{ width: '13px', height: '13px' }} />
                Admin
              </button>
            )}
          </nav>

          {/* Right actions — desktop only (>= 900px) */}
          <div className="navbar-actions-desktop">

            {/* AI Agent button */}
            <button
              onClick={onOpenAIAssistant}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.4rem 0.875rem',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--green-600)',
                background: 'var(--green-50)',
                border: '1px solid var(--green-200)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--green-100)';
                e.currentTarget.style.borderColor = 'var(--green-300)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--green-50)';
                e.currentTarget.style.borderColor = 'var(--green-200)';
              }}
            >
              <Sparkles style={{ width: '13px', height: '13px' }} />
              <span>AI Guide</span>
            </button>

            {/* Cart */}
            <button
              onClick={onOpenCart}
              title="Cart"
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px',
                background: 'none',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'background 0.15s, border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-muted)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <ShoppingBag style={{ width: '16px', height: '16px' }} />
              {cartItemCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-7px', right: '-7px',
                  minWidth: '18px', height: '18px',
                  background: 'var(--green-500)',
                  color: '#fff',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  borderRadius: '9px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                  lineHeight: 1,
                }}>
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Auth */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-light)' }}>
                <button
                  onClick={onOpenProfile}
                  title="View User Profile & Orders"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    background: 'none',
                    border: '1px solid transparent',
                    borderRadius: '8px',
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--green-50)';
                    e.currentTarget.style.borderColor = 'var(--green-200)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'var(--green-100)',
                    border: '1px solid var(--green-300)',
                    color: 'var(--green-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {user.full_name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                      {user.full_name}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--green-600)', textTransform: 'capitalize', fontWeight: 500 }}>
                      {user.role}
                    </div>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  title="Sign out"
                  style={{
                    padding: '0.375rem',
                    background: 'none',
                    border: '1px solid var(--border-light)',
                    borderRadius: '5px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#c53030';
                    e.currentTarget.style.borderColor = '#fed7d7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                  }}
                >
                  <LogOut style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.4rem 0.875rem',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  background: 'none',
                  border: '1px solid var(--border-mid)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <User style={{ width: '13px', height: '13px' }} />
                Sign In
              </button>
            )}
          </div>

          {/* Right actions — mobile app bar (< 900px, Flipkart/Myntra style) */}
          <div className="navbar-actions-mobile">
            {/* Quick Cart button */}
            <button
              onClick={onOpenCart}
              title="Cart"
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px',
                background: '#f4f0e8',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
            >
              <ShoppingBag style={{ width: '17px', height: '17px' }} />
              {cartItemCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px', right: '-5px',
                  minWidth: '17px', height: '17px',
                  background: 'var(--green-500)',
                  color: '#fff',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  borderRadius: '9px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Profile / Auth trigger */}
            {user ? (
              <button
                onClick={onOpenProfile}
                style={{
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  background: 'var(--green-100)',
                  border: '1px solid var(--green-300)',
                  color: 'var(--green-700)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {user.full_name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                style={{
                  padding: '0.35rem 0.625rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--green-700)',
                  background: 'var(--green-50)',
                  border: '1px solid var(--green-200)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile search — Flipkart/Myntra style prominent app search */}
        <div className="md:hidden" style={{ padding: '0 0.25rem 0.625rem 0.25rem' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search style={{
              position: 'absolute', left: '0.75rem',
              width: '15px', height: '15px',
              color: 'var(--text-light)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Search sabji, honey, apparel, drinks, tech…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                paddingLeft: '2.25rem',
                paddingRight: '4.75rem',
                paddingTop: '0.55rem',
                paddingBottom: '0.55rem',
                background: '#f4f0e8',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <div style={{ position: 'absolute', right: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={onOpenVisualSearch}
                title="Camera search"
                style={{
                  padding: '0.3rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--green-600)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Camera style={{ width: '15px', height: '15px' }} />
              </button>
              <button
                type="button"
                onClick={onSearchSubmit}
                style={{
                  padding: '0.3rem 0.625rem',
                  background: 'var(--green-500)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Department Tabs Bar */}
      <div
        style={{
          borderTop: '1px solid var(--border-light)',
          background: '#f8faf7',
          padding: '0.35rem 0',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <div
          className="container mx-auto"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            maxWidth: '100%',
          }}
        >
          {DEPARTMENTS.map((dept) => {
            const isActive = (selectedDepartment || 'all') === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => onSelectDepartment && onSelectDepartment(dept.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  background: isActive ? 'var(--green-600)' : '#ffffff',
                  border: isActive ? '1px solid var(--green-600)' : '1px solid var(--border-light)',
                  boxShadow: isActive ? '0 1px 3px rgba(46,125,50,0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--green-50)';
                    e.currentTarget.style.borderColor = 'var(--green-300)';
                    e.currentTarget.style.color = 'var(--green-700)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <span>{dept.icon}</span>
                <span>{dept.name}</span>
                {dept.badge && (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '9999px',
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-muted)',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {dept.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
