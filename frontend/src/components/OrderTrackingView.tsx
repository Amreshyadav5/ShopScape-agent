import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  MapPin,
  Calendar,
} from 'lucide-react';
import type { Order, User } from '../types';
import { api } from '../api';
import { formatPrice, formatDate } from '../utils';

interface OrderTrackingViewProps {
  user: User | null;
  currencySymbol?: string;
  initialOrderNumber?: string | null;
  onBackToStore: () => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  user,
  currencySymbol = '₹',
  initialOrderNumber,
  onBackToStore,
}) => {
  const [searchNumber, setSearchNumber] = useState(initialOrderNumber || '');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'delivered'>('all');

  // Load all past orders on mount
  useEffect(() => {
    loadAllOrders();
  }, [user]);

  // If initialOrderNumber passed, look it up or select it
  useEffect(() => {
    if (initialOrderNumber) {
      handleSearch(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const loadAllOrders = async () => {
    setLoading(true);
    try {
      const orderList = await api.getMyOrders();
      setOrders(orderList || []);
      // If no active order selected yet and orders exist, set the latest order as active
      if (!activeOrder && orderList && orderList.length > 0 && !initialOrderNumber) {
        setActiveOrder(orderList[0]);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (orderNumToFind?: string) => {
    const num = (orderNumToFind || searchNumber).trim();
    if (!num) return;
    setError(null);
    setSearching(true);
    try {
      const order = await api.trackOrder(num);
      setActiveOrder(order);
      // Ensure it's in the list if not already present
      setOrders((prev) => {
        if (prev.some((o) => o.order_number === order.order_number)) return prev;
        return [order, ...prev];
      });
    } catch (err: any) {
      setError(err.message || `No order found with reference "${num}"`);
    } finally {
      setSearching(false);
    }
  };

  const handleCopyOrderNumber = (num: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(num);
    setCopiedId(num);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusStep = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'delivered':
        return 4;
      case 'shipped':
        return 3;
      case 'processing':
        return 2;
      case 'confirmed':
      case 'paid':
        return 1;
      default:
        return 1;
    }
  };

  const getBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') {
      return { background: '#eaf3ed', color: '#1f4212', border: '1px solid #cbe2d3' };
    }
    if (s === 'shipped') {
      return { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
    }
    if (s === 'processing') {
      return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
    }
    return { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };
  };

  // Filtered orders list
  const filteredOrders = orders.filter((ord) => {
    const status = (ord.fulfillment_status || '').toLowerCase();
    if (filterTab === 'delivered') return status === 'delivered';
    if (filterTab === 'active') return status !== 'delivered' && status !== 'cancelled';
    return true;
  });

  return (
    <div
      style={{
        maxWidth: '1120px',
        width: '100%',
        margin: '0 auto',
        padding: '2rem 1.5rem 4rem',
        boxSizing: 'border-box',
        color: 'var(--text-primary)',
      }}
    >
      {/* Return to Storefront button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          onClick={onBackToStore}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: '#ffffff',
            border: '1px solid var(--border-light)',
            padding: '0.45rem 0.875rem',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-xs)',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--green-600)';
            e.currentTarget.style.borderColor = 'var(--green-400)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border-light)';
          }}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} />
          <span>Return to ShopScape Storefront</span>
        </button>
      </div>

      {/* Main Header with Search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--green-100)',
              color: 'var(--green-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--green-200)',
              flexShrink: 0,
            }}
          >
            <Package style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}
            >
              Order Tracking & Fulfillment
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Real-time delivery status, complete purchase records, and fulfillment journey.
            </p>
          </div>
        </div>

        {/* Search by Order ID */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              style={{
                width: '15px',
                height: '15px',
                color: 'var(--text-light)',
                position: 'absolute',
                left: '12px',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="e.g. ORD-20261011-..."
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              style={{
                paddingLeft: '2.25rem',
                paddingRight: '0.875rem',
                paddingTop: '0.55rem',
                paddingBottom: '0.55rem',
                background: '#ffffff',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
                width: '230px',
                outline: 'none',
                boxShadow: 'var(--shadow-xs)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--green-500)';
                e.target.style.boxShadow = '0 0 0 3px rgba(61, 122, 40, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-light)';
                e.target.style.boxShadow = 'var(--shadow-xs)';
              }}
            />
          </div>
          <button
            type="submit"
            disabled={searching || !searchNumber.trim()}
            style={{
              padding: '0.55rem 1rem',
              background: searching || !searchNumber.trim() ? '#d4c9b8' : 'var(--green-500)',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: searching || !searchNumber.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              boxShadow: 'var(--shadow-xs)',
              transition: 'background 0.15s',
            }}
          >
            {searching ? (
              <RefreshCw className="animate-spin" style={{ width: '14px', height: '14px' }} />
            ) : (
              'Track'
            )}
          </button>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.875rem 1rem',
            borderRadius: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0, color: '#dc2626' }} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#dc2626',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================================
          ACTIVE TRACKED ORDER (PRIMARY HERO CARD)
      ========================================================================== */}
      {activeOrder && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            padding: '1.75rem',
            marginBottom: '2.5rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              paddingBottom: '1.25rem',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                  }}
                >
                  Active Tracking Record
                </span>
                <span
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    background: 'var(--green-100)',
                    color: 'var(--green-700)',
                  }}
                >
                  Verified Order
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1.375rem',
                    fontWeight: 700,
                    color: 'var(--green-600)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {activeOrder.order_number}
                </h2>
                <button
                  type="button"
                  onClick={(e) => handleCopyOrderNumber(activeOrder.order_number, e)}
                  title="Copy reference number"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {copiedId === activeOrder.order_number ? (
                    <Check style={{ width: '16px', height: '16px', color: 'var(--green-600)' }} />
                  ) : (
                    <Copy style={{ width: '16px', height: '16px' }} />
                  )}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Calendar style={{ width: '13px', height: '13px' }} />
                <span>Placed on {formatDate(activeOrder.created_at)}</span>
              </div>
            </div>

            {/* Status and Payment details */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
              <span
                style={{
                  ...getBadgeStyle(activeOrder.fulfillment_status),
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                ● {activeOrder.fulfillment_status}
              </span>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Payment:{' '}
                <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {activeOrder.payment_status}
                </strong>{' '}
                via{' '}
                <span style={{ textTransform: 'capitalize' }}>
                  {activeOrder.payment_method === 'sandbox'
                    ? 'Test Card'
                    : activeOrder.payment_method === 'cod'
                    ? 'Cash on Delivery'
                    : 'Online Gateway'}
                </span>
              </div>
            </div>
          </div>

          {/* 4-Step Fulfillment Journey Timeline */}
          <div style={{ padding: '1.5rem 0 1rem' }}>
            <h3
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: '1.25rem',
              }}
            >
              Fulfillment & Dispatch Journey
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5rem',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              {[
                { title: 'Confirmed', desc: 'Order Accepted', icon: CheckCircle2, step: 1 },
                { title: 'Processing', desc: 'Packed Fresh', icon: Clock, step: 2 },
                { title: 'In Transit', desc: 'Shipped via Courier', icon: Truck, step: 3 },
                { title: 'Delivered', desc: 'Safely Arrived', icon: Package, step: 4 },
              ].map((st) => {
                const currentStep = getStatusStep(activeOrder.fulfillment_status);
                const isPassed = currentStep >= st.step;
                const isCurrent = currentStep === st.step;
                const Icon = st.icon;

                return (
                  <div
                    key={st.title}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.5rem',
                        transition: 'all 0.2s',
                        background: isPassed ? 'var(--green-500)' : 'var(--bg-muted)',
                        color: isPassed ? '#ffffff' : 'var(--text-light)',
                        border: isPassed ? 'none' : '1px solid var(--border-light)',
                        boxShadow: isPassed ? '0 0 0 4px var(--green-100)' : 'none',
                      }}
                    >
                      <Icon style={{ width: '20px', height: '20px' }} />
                    </div>

                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: isCurrent ? 700 : isPassed ? 600 : 400,
                        color: isCurrent
                          ? 'var(--green-600)'
                          : isPassed
                          ? 'var(--text-primary)'
                          : 'var(--text-light)',
                      }}
                    >
                      {st.title}
                    </span>

                    <span
                      style={{
                        fontSize: '0.6875rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.15rem',
                      }}
                    >
                      {st.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verified Courier Tracking Callout */}
          {activeOrder.tracking_number && (
            <div
              style={{
                marginTop: '1rem',
                marginBottom: '1.25rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'var(--bg-muted)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <Truck style={{ width: '16px', height: '16px', color: 'var(--green-500)' }} />
                <span>Verified Courier Tracking AWB:</span>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--green-600)' }}>
                {activeOrder.tracking_number}
              </span>
            </div>
          )}

          {/* Two-Column Breakdown: Items on Left, Destination & Financials on Right */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-light)',
            }}
          >
            {/* Ordered Products List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <ShoppingBag style={{ width: '13px', height: '13px' }} />
                Ordered Items ({activeOrder.items?.length || 0})
              </h4>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  paddingRight: '0.25rem',
                }}
              >
                {activeOrder.items?.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '0.75rem' }}>
                      <p
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.product_name}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Qty: <strong style={{ color: 'var(--text-primary)' }}>{item.quantity}</strong> × {formatPrice(item.unit_price, currencySymbol)}
                      </span>
                    </div>

                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', flexShrink: 0 }}>
                      {formatPrice(item.total_price, currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Destination & Financials */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <MapPin style={{ width: '13px', height: '13px' }} />
                Delivery & Charges Summary
              </h4>

              <div
                style={{
                  padding: '1.125rem 1.25rem',
                  borderRadius: '12px',
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Recipient: </span>
                  <span>{activeOrder.customer_name}</span>
                </div>

                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Address: </span>
                  <span style={{ wordBreak: 'break-word' }}>{activeOrder.shipping_address}</span>
                </div>

                <div
                  style={{
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatPrice(activeOrder.subtotal, currencySymbol)}
                    </span>
                  </div>

                  {activeOrder.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--green-500)' }}>
                      <span>Discount {activeOrder.coupon_code ? `(${activeOrder.coupon_code})` : ''}</span>
                      <span style={{ fontWeight: 600 }}>-{formatPrice(activeOrder.discount_amount, currencySymbol)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Delivery Fee</span>
                    <span style={{ fontWeight: 600, color: activeOrder.shipping_fee === 0 ? 'var(--green-500)' : 'var(--text-primary)' }}>
                      {activeOrder.shipping_fee === 0 ? 'FREE' : formatPrice(activeOrder.shipping_fee, currencySymbol)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>GST (5%)</span>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {formatPrice(activeOrder.tax_amount, currencySymbol)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.625rem',
                      marginTop: '0.25rem',
                      borderTop: '1px solid var(--border-mid)',
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>Total Paid</span>
                    <span style={{ fontSize: '1.0625rem', color: 'var(--green-600)', fontWeight: 700 }}>
                      {formatPrice(activeOrder.total_amount, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          COMPLETE PAST ORDERS & PURCHASE TRACK RECORD
      ========================================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.375rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              All Past Orders & Purchase Records
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Select any past order below to inspect its complete fulfillment timeline and charges receipt.
            </p>
          </div>

          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'var(--bg-muted)',
              padding: '0.25rem',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
            }}
          >
            {[
              { id: 'all', label: `All (${orders.length})` },
              { id: 'active', label: 'Active' },
              { id: 'delivered', label: 'Delivered' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: filterTab === tab.id ? 600 : 500,
                  color: filterTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: filterTab === tab.id ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: filterTab === tab.id ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && orders.length === 0 ? (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid var(--border-light)',
            }}
          >
            <RefreshCw className="animate-spin" style={{ width: '28px', height: '28px', color: 'var(--green-500)', margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Loading past orders & track records...
            </p>
          </div>
        ) : filteredOrders.length > 0 ? (
          /* Orders Grid */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1rem',
            }}
          >
            {filteredOrders.map((ord) => {
              const isSelected = activeOrder?.order_number === ord.order_number;
              const badgeStyle = getBadgeStyle(ord.fulfillment_status);

              return (
                <div
                  key={ord.id}
                  onClick={() => {
                    setActiveOrder(ord);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    background: isSelected ? 'var(--green-50)' : '#ffffff',
                    border: isSelected ? '2px solid var(--green-500)' : '1px solid var(--border-light)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--green-300)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                    }
                  }}
                >
                  <div>
                    {/* Top row: Order Number & Status Badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        marginBottom: '0.625rem',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          color: 'var(--green-600)',
                          background: '#ffffff',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-light)',
                        }}
                      >
                        {ord.order_number}
                      </span>

                      <span
                        style={{
                          ...badgeStyle,
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                        }}
                      >
                        {ord.fulfillment_status}
                      </span>
                    </div>

                    {/* Customer & Address */}
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '0.25rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {ord.customer_name} · {ord.shipping_address}
                    </p>

                    {/* Items preview */}
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.875rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                      }}
                    >
                      {ord.items?.length || 1} item{ord.items && ord.items.length > 1 ? 's' : ''}:{' '}
                      {ord.items?.map((i) => i.product_name).join(', ')}
                    </p>
                  </div>

                  {/* Bottom row: Total Amount & Action CTA */}
                  <div
                    style={{
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>
                        Total Amount
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {formatPrice(ord.total_amount, currencySymbol)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--green-600)',
                      }}
                    >
                      <span>{isSelected ? 'Currently Viewing' : 'Track Details'}</span>
                      <ChevronRight style={{ width: '14px', height: '14px' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div
            style={{
              padding: '3.5rem 1.5rem',
              textAlign: 'center',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid var(--border-light)',
              maxWidth: '450px',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: 'var(--bg-muted)',
                color: 'var(--text-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Package style={{ width: '26px', height: '26px' }} />
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.1875rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              No orders found
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
              No orders matched your selected filter. Start shopping our organic collection or consult our AI Shopping Assistant.
            </p>
            <button
              onClick={onBackToStore}
              style={{
                padding: '0.55rem 1.25rem',
                background: 'var(--green-500)',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Browse Catalog
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
