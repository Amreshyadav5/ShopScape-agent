import React from 'react';
import { Star, ShoppingCart, Check, AlertTriangle, Sparkles } from 'lucide-react';
import type { Product } from '../types';
import { formatPrice, resolveImageUrl } from '../utils';

interface ProductCardProps {
  product: Product;
  currencySymbol?: string;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  onAskAIAboutProduct?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  currencySymbol = '₹',
  onAddToCart,
  onViewDetails,
  onAskAIAboutProduct,
}) => {
  const [added, setAdded] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;

  // Normalize category display
  const categoryDisplay = (product.category || 'General')
    .split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div
      onClick={() => onViewDetails(product)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        borderColor: hovered ? 'var(--border-mid)' : 'var(--border-light)',
      }}
    >
      {/* Image container — consistent 4:3 aspect ratio */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4/3',
        background: 'var(--bg-muted)',
        overflow: 'hidden',
      }}>
        <img
          src={resolveImageUrl(product.image_url)}
          alt={product.name}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            transition: 'transform 0.4s ease',
            transform: hovered ? 'scale(1.04)' : 'scale(1)',
          }}
          onError={(e) => {
            // Use category-appropriate fallback
            const cat = (product.category || '').toLowerCase();
            const fallbacks: Record<string, string> = {
              honey: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80',
              oil: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
              nuts: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&w=600&q=80',
              seeds: 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=600&q=80',
              grains: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
              tea: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
              coffee: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
              snacks: 'https://images.unsplash.com/photo-1484723091739-30990a2c2915?auto=format&fit=crop&w=600&q=80',
              'fresh-groceries': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
              'clothing-shoes': 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80',
              'beverages-drinks': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
              electronics: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
            };
            (e.target as HTMLImageElement).src = fallbacks[cat] || fallbacks['honey'];
          }}
        />

        {/* Organic badge — top right, minimal */}
        {product.is_organic && (
          <div style={{
            position: 'absolute', top: '0.625rem', right: '0.625rem',
            padding: '0.2rem 0.5rem',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid var(--green-200)',
            borderRadius: '3px',
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'var(--green-600)',
          }}>
            Organic
          </div>
        )}

        {/* AI button — appears on hover, top left */}
        {onAskAIAboutProduct && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAskAIAboutProduct(product); }}
            title="Ask AI about this product"
            style={{
              position: 'absolute', top: '0.625rem', left: '0.625rem',
              padding: '0.35rem',
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid var(--border-light)',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--green-600)',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
          >
            <Sparkles style={{ width: '12px', height: '12px' }} />
          </button>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(249,246,241,0.80)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              padding: '0.3rem 0.75rem',
              background: '#fff',
              border: '1px solid var(--border-mid)',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}>
              Out of Stock
            </span>
          </div>
        )}

        {/* Low stock warning */}
        {isLowStock && !isOutOfStock && (
          <div style={{
            position: 'absolute', bottom: '0.5rem', left: '0.5rem',
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            padding: '0.2rem 0.5rem',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid var(--amber-400)',
            borderRadius: '3px',
            fontSize: '0.6875rem',
            color: 'var(--amber-500)',
            fontWeight: 500,
          }}>
            <AlertTriangle style={{ width: '11px', height: '11px' }} />
            Only {product.stock_quantity} left
          </div>
        )}
      </div>

      {/* Card content */}
      <div style={{ padding: '0.875rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

        {/* Category + Rating row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="category-label">{categoryDisplay}</span>
          {product.average_rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Star style={{ width: '11px', height: '11px', fill: 'var(--amber-400)', color: 'var(--amber-400)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {product.average_rating.toFixed(1)}
              </span>
              {product.review_count > 0 && (
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>
                  ({product.review_count})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Product name */}
        <h3 style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {product.name}
        </h3>

        {/* Short description */}
        {(product.short_description || product.description) && (
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
          }}>
            {product.short_description || product.description}
          </p>
        )}

        {/* Price + Add to cart */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: '0.625rem',
          borderTop: '1px solid var(--border-light)',
          marginTop: 'auto',
          gap: '0.5rem',
        }}>
          <div>
            <div style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}>
              {formatPrice(product.price, currencySymbol)}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-light)', marginTop: '0.125rem', letterSpacing: '0.01em' }}>
              incl. taxes
            </div>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.4rem 0.75rem',
              fontSize: '0.775rem',
              fontWeight: 500,
              borderRadius: '5px',
              border: 'none',
              cursor: isOutOfStock ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, color 0.15s',
              background: added
                ? 'var(--green-100)'
                : isOutOfStock
                ? 'var(--bg-muted)'
                : 'var(--green-500)',
              color: added
                ? 'var(--green-600)'
                : isOutOfStock
                ? 'var(--text-light)'
                : '#fff',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isOutOfStock && !added) {
                e.currentTarget.style.background = 'var(--green-600)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isOutOfStock && !added) {
                e.currentTarget.style.background = 'var(--green-500)';
              }
            }}
          >
            {added ? (
              <>
                <Check style={{ width: '12px', height: '12px' }} />
                Added
              </>
            ) : (
              <>
                <ShoppingCart style={{ width: '12px', height: '12px' }} />
                Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
