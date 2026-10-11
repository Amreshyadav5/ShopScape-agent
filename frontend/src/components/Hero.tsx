import React from 'react';
import { ArrowRight, Sparkles, Camera, ShieldCheck, Truck, Star, Leaf } from 'lucide-react';

interface HeroProps {
  onExploreCatalog: () => void;
  onOpenAIAssistant: () => void;
  onOpenVisualSearch: () => void;
  onSelectCategory: (category: string) => void;
}

export const Hero: React.FC<HeroProps> = ({
  onExploreCatalog,
  onOpenAIAssistant,
  onOpenVisualSearch,
  onSelectCategory,
}) => {
  const quickLinks = [
    { label: '🥦 Fresh Sabji & Produce', cat: 'fresh-groceries' },
    { label: '👕 Clothing & Shoes', cat: 'clothing-shoes' },
    { label: '🧃 Drinks & Beverages', cat: 'beverages-drinks' },
    { label: '⚡ Smart Electronics', cat: 'electronics' },
    { label: '🍯 Pure Honey & Pantry', cat: 'organic-pantry' },
  ];

  return (
    <section style={{
      position: 'relative',
      background: 'radial-gradient(circle at 85% 15%, rgba(217, 235, 202, 0.35) 0%, rgba(249, 246, 241, 0) 55%), radial-gradient(circle at 10% 85%, rgba(237, 229, 216, 0.4) 0%, rgba(249, 246, 241, 0) 50%), linear-gradient(180deg, #fbf9f5 0%, #f7f4ee 100%)',
      borderBottom: '1px solid var(--border-light)',
      padding: '3.75rem 0 3rem',
    }}>
      <div className="container mx-auto">
        <div style={{ maxWidth: '720px' }}>

          {/* Eyebrow badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '1.25rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            background: 'rgba(61, 122, 40, 0.08)',
            border: '1px solid rgba(61, 122, 40, 0.22)',
          }}>
            <Leaf style={{ width: '13px', height: '13px', color: 'var(--green-500)' }} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--green-600)',
            }}>
              Curated Departments · Fresh, Fashion, Drinks & Tech
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.25rem, 4.5vw, 3.4rem)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            marginBottom: '1.15rem',
          }}>
            Everyday essentials,<br />
            <span style={{
              fontStyle: 'italic',
              background: 'linear-gradient(135deg, #1f4212 0%, #3d7a28 60%, #8c2d2a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              curated with care.
            </span>
          </h1>

          {/* Subtext */}
          <p style={{
            fontSize: '0.9625rem',
            color: 'var(--text-muted)',
            lineHeight: 1.75,
            marginBottom: '1.875rem',
            maxWidth: '580px',
          }}>
            Explore farm-fresh sabji & produce, natural everyday clothing & footwear, chilled artisanal beverages, smart electronic gadgets, and certified organic pantry essentials.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
            <button
              onClick={onExploreCatalog}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #2e5e1c 0%, #3d7a28 100%)',
                border: '1px solid #2e5e1c',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(46, 94, 28, 0.28)',
                transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(46, 94, 28, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(46, 94, 28, 0.28)';
              }}
            >
              Shop All Products
              <ArrowRight style={{ width: '15px', height: '15px' }} />
            </button>

            <button
              onClick={onOpenAIAssistant}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.35rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1c2a14',
                background: '#ffffff',
                border: '1px solid rgba(61, 122, 40, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.15s, border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.borderColor = 'var(--green-500)';
                e.currentTarget.style.background = '#f7faf5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(61, 122, 40, 0.3)';
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              <Sparkles style={{ width: '15px', height: '15px', color: 'var(--green-500)' }} />
              Ask AI Guide
            </button>

            <button
              onClick={onOpenVisualSearch}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.15rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(61, 122, 40, 0.06)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Camera style={{ width: '15px', height: '15px' }} />
              Visual Search
            </button>
          </div>

          {/* Quick category links */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600 }}>Browse:</span>
            {quickLinks.map((chip) => (
              <button
                key={chip.label}
                onClick={() => onSelectCategory(chip.cat)}
                style={{
                  padding: '0.35rem 0.8rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  background: '#ffffff',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--green-700)';
                  e.currentTarget.style.borderColor = 'var(--green-300)';
                  e.currentTarget.style.background = '#f0f6eb';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

        </div>

        {/* TRUST DOCK */}
        <div className="hero-trust-dock">
          {[
            {
              icon: <ShieldCheck style={{ width: '18px', height: '18px' }} />,
              title: '100% Certified Organic',
              desc: 'Every product third-party tested',
            },
            {
              icon: <Star style={{ width: '18px', height: '18px' }} />,
              title: 'Verified Reviews',
              desc: 'Only real customer feedback',
            },
            {
              icon: <Truck style={{ width: '18px', height: '18px' }} />,
              title: 'Free Shipping over ₹999',
              desc: 'Fast, safe cold-chain delivery',
            },
            {
              icon: <Sparkles style={{ width: '18px', height: '18px' }} />,
              title: 'AI Shopping Guide',
              desc: 'Smart advice, no generic search',
            },
          ].map((item, i) => (
            <div key={i} className="trust-item-cell">
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#f0f6ea',
                border: '1px solid #d9ebca',
                color: 'var(--green-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.25,
                }}>
                  {item.title}
                </div>
                <div style={{
                  fontSize: '0.7188rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.15rem',
                  lineHeight: 1.35,
                }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
