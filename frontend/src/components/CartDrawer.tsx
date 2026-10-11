import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Tag, Check, AlertCircle } from 'lucide-react';
import type { Cart } from '../types';
import { formatPrice, resolveImageUrl } from '../utils';

interface CartDrawerProps {
  isOpen: boolean;
  cart: Cart | null;
  currencySymbol?: string;
  freeShippingThreshold?: number;
  onClose: () => void;
  onUpdateQuantity: (itemId: number, newQty: number) => void;
  onRemoveItem: (itemId: number) => void;
  onApplyCoupon: (code: string) => Promise<void>;
  onProceedToCheckout: () => void;
  onExploreCatalog: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  cart,
  currencySymbol = '₹',
  freeShippingThreshold = 999,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onApplyCoupon,
  onProceedToCheckout,
  onExploreCatalog,
}) => {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  if (!isOpen) return null;

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const remainingForFreeShip = Math.max(0, freeShippingThreshold - subtotal);
  const freeShipPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError(null);
    setCouponLoading(true);
    try {
      await onApplyCoupon(couponInput.trim().toUpperCase());
      setCouponInput('');
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, overflow: 'hidden',
      background: 'rgba(28,42,20,0.45)',
    }}>
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

      <div style={{ position: 'absolute', inset: 0, right: 0, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column',
          height: '100%',
        }}>
          {/* Header */}
          <div style={{
            padding: '1.25rem 1.25rem',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <ShoppingBag style={{ width: '18px', height: '18px', color: 'var(--green-500)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                Your Cart
              </h3>
              {items.length > 0 && (
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  background: 'var(--green-100)',
                  color: 'var(--green-700)',
                  borderRadius: '3px',
                }}>
                  {items.reduce((a, it) => a + it.quantity, 0)}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '0.375rem',
                background: 'none',
                border: '1px solid var(--border-light)',
                borderRadius: '5px',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center',
                transition: 'background 0.15s',
              }}
            >
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>

          {/* Free shipping progress */}
          <div style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border-light)',
            background: 'var(--bg-muted)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              {remainingForFreeShip > 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>
                  Add <strong style={{ color: 'var(--green-600)' }}>{formatPrice(remainingForFreeShip, currencySymbol)}</strong> for free shipping
                </span>
              ) : (
                <span style={{ color: 'var(--green-600)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Check style={{ width: '12px', height: '12px' }} />
                  Free shipping unlocked!
                </span>
              )}
              <span style={{ color: 'var(--text-light)', fontSize: '0.6875rem' }}>{Math.round(freeShipPercent)}%</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--border-mid)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${freeShipPercent}%`,
                background: 'var(--green-500)',
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
            {items.length === 0 ? (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '2rem',
              }}>
                <div style={{
                  width: '56px', height: '56px',
                  background: 'var(--bg-muted)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem',
                }}>
                  <ShoppingBag style={{ width: '24px', height: '24px', color: 'var(--text-light)' }} />
                </div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                  Your cart is empty
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  Discover our farm-fresh honey, cold-pressed oils, and organic grains.
                </p>
                <button
                  onClick={() => { onClose(); onExploreCatalog(); }}
                  className="btn btn-primary btn-sm"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {items.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex', gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                  }}>
                    <img
                      src={resolveImageUrl(item.product_image)}
                      alt={item.product_name}
                      style={{
                        width: '60px', height: '60px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        background: 'var(--bg-strong)',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=200&q=60';
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                          {item.product_name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          title="Remove"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-light)', padding: '0.125rem',
                            flexShrink: 0, transition: 'color 0.15s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#c53030'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-light)'}
                        >
                          <Trash2 style={{ width: '13px', height: '13px' }} />
                        </button>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatPrice(item.unit_price, currencySymbol)} each
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Quantity */}
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          border: '1px solid var(--border-mid)',
                          borderRadius: '5px', overflow: 'hidden',
                          background: 'var(--bg-surface)',
                        }}>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            style={{
                              width: '26px', height: '26px',
                              background: 'none', border: 'none',
                              cursor: 'pointer', fontSize: '0.875rem',
                              color: 'var(--text-muted)', transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            −
                          </button>
                          <span style={{
                            width: '28px', textAlign: 'center',
                            fontSize: '0.8125rem', fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock_available}
                            style={{
                              width: '26px', height: '26px',
                              background: 'none', border: 'none',
                              cursor: item.quantity >= item.stock_available ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                              color: 'var(--text-muted)',
                              opacity: item.quantity >= item.stock_available ? 0.35 : 1,
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { if (item.quantity < item.stock_available) e.currentTarget.style.background = 'var(--bg-muted)'; }}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            +
                          </button>
                        </div>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatPrice(item.total_price, currencySymbol)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer totals & checkout */}
          {items.length > 0 && (
            <div style={{
              padding: '1rem 1.25rem',
              borderTop: '1px solid var(--border-light)',
              background: 'var(--bg-surface)',
              display: 'flex', flexDirection: 'column', gap: '0.875rem',
            }}>
              {/* Coupon */}
              <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Tag style={{
                    position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)',
                    width: '12px', height: '12px', color: 'var(--text-light)', pointerEvents: 'none',
                  }} />
                  <input
                    type="text"
                    placeholder="Promo code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    style={{
                      width: '100%',
                      paddingLeft: '1.75rem', paddingRight: '0.625rem',
                      paddingTop: '0.4rem', paddingBottom: '0.4rem',
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '5px',
                      fontSize: '0.8125rem',
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={couponLoading || !couponInput.trim()}
                  className="btn btn-secondary btn-sm"
                  style={{ opacity: couponLoading || !couponInput.trim() ? 0.5 : 1 }}
                >
                  Apply
                </button>
              </form>

              {couponError && (
                <p style={{ fontSize: '0.75rem', color: '#c53030', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle style={{ width: '12px', height: '12px' }} />
                  {couponError}
                </p>
              )}

              {cart?.coupon_code && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--green-50)',
                  border: '1px solid var(--green-200)',
                  borderRadius: '5px',
                  fontSize: '0.75rem', color: 'var(--green-700)', fontWeight: 500,
                }}>
                  <span>Code: <strong>{cart.coupon_code}</strong></span>
                  <span>−{formatPrice(cart.discount_amount, currencySymbol)}</span>
                </div>
              )}

              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {[
                  { label: 'Subtotal', val: formatPrice(cart?.subtotal || 0, currencySymbol), muted: true },
                  ...(cart && cart.discount_amount > 0 ? [{ label: 'Discount', val: `−${formatPrice(cart.discount_amount, currencySymbol)}`, green: true }] : []),
                  { label: 'Shipping', val: cart?.shipping_fee === 0 ? 'FREE' : formatPrice(cart?.shipping_fee || 0, currencySymbol), green: cart?.shipping_fee === 0 },
                  { label: 'GST (5%)', val: formatPrice(cart?.tax_amount || 0, currencySymbol), muted: true },
                ].map((row: any) => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    color: row.green ? 'var(--green-600)' : 'var(--text-muted)',
                  }}>
                    <span>{row.label}</span>
                    <span style={{ fontWeight: row.green ? 600 : 400 }}>{row.val}</span>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '0.9375rem', fontWeight: 700,
                  color: 'var(--text-primary)',
                  paddingTop: '0.625rem',
                  borderTop: '1px solid var(--border-light)',
                  marginTop: '0.25rem',
                }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--green-600)' }}>{formatPrice(cart?.total_amount || 0, currencySymbol)}</span>
                </div>
              </div>

              {/* Checkout button */}
              <button
                type="button"
                onClick={() => { onClose(); onProceedToCheckout(); }}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Proceed to Checkout
                <ArrowRight style={{ width: '15px', height: '15px' }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
