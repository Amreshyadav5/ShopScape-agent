import React from 'react';
import { ShoppingBag, Leaf } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'home' | 'catalog' | 'orders' | 'admin') => void;
  onOpenPolicy: (policyName: string) => void;
  onOpenAIAssistant: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenPolicy,
  onOpenAIAssistant,
}) => {
  return (
    <footer style={{
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-light)',
      padding: '3rem 0 1.5rem',
      color: 'var(--text-muted)',
      fontSize: '0.8125rem',
    }}>
      <div className="container mx-auto">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '2rem',
          marginBottom: '2.5rem',
        }}>

          {/* Brand */}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <div style={{
                width: '28px', height: '28px',
                background: 'var(--green-500)',
                borderRadius: '5px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShoppingBag style={{ width: '14px', height: '14px', color: '#fff' }} />
              </div>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '1.0625rem',
                color: 'var(--text-primary)',
              }}>
                ShopScape
              </span>
            </div>
            <p style={{ lineHeight: 1.65, color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Premium organic goods sourced directly from certified farmers. Every product traceable, every origin verified.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--green-500)', fontSize: '0.75rem', fontWeight: 500 }}>
              <Leaf style={{ width: '13px', height: '13px' }} />
              Certified Organic Standards
            </div>
          </div>

          {/* Catalog */}
          <div>
            <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '0.875rem' }}>
              Shop
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'All Products', action: () => onNavigate('catalog') },
                { label: 'Raw Honey', action: () => onNavigate('catalog') },
                { label: 'Cold-Pressed Oils', action: () => onNavigate('catalog') },
                { label: 'Whole Grains', action: () => onNavigate('catalog') },
                { label: 'Herbal Teas', action: () => onNavigate('catalog') },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={item.action}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: '0.8125rem',
                      padding: 0, transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--green-500)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer care */}
          <div>
            <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '0.875rem' }}>
              Support
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Track Your Order', action: () => onNavigate('orders') },
                { label: 'AI Shopping Guide', action: onOpenAIAssistant },
                { label: 'Shipping Policy', action: () => onOpenPolicy('shipping') },
                { label: 'Returns & Refunds', action: () => onOpenPolicy('returns') },
                { label: 'Privacy Policy', action: () => onOpenPolicy('privacy') },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={item.action}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: '0.8125rem',
                      padding: 0, transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--green-500)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust info */}
          <div>
            <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '0.875rem' }}>
              Our Promise
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                '100% certified organic sourcing',
                'Third-party lab tested every batch',
                'Transparent farm-to-shelf traceability',
                'Secure checkout with JWT authentication',
                'INR pricing, GST inclusive',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--green-500)', marginTop: '1px', flexShrink: 0 }}>·</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7813rem', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-light)',
        }}>
          <p>© 2026 ShopScape Organic. All rights reserved.</p>
          <p>Currency: INR (₹) · Secure checkout · Farm-direct organic</p>
        </div>
      </div>
    </footer>
  );
};
