import React, { useState, useEffect } from 'react';
import { 
  X, 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Package, 
  Award, 
  LogOut, 
  Check, 
  ShieldCheck, 
  Copy,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import type { User, Order } from '../types';
import { api } from '../api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
  onTrackOrder: (orderNumber: string) => void;
  currencySymbol?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
  onTrackOrder,
  currencySymbol = '₹',
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'orders' | 'perks'>('details');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(localStorage.getItem('shopease_customer_phone') || '+91 98765 43210');
  const [address, setAddress] = useState(localStorage.getItem('shopease_shipping_address') || '14 Rosewood Lane, Green Park, New Delhi 110016');
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      loadUserOrders();
    }
  }, [isOpen]);

  const loadUserOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await api.getMyOrders();
      setOrders(data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  if (!isOpen || !user) return null;

  // Extract initials
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full name cannot be empty');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const updated = await api.updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
      });
      onUpdateUser(updated);

      // Save phone and address locally for checkout convenience
      localStorage.setItem('shopease_customer_phone', phone.trim());
      localStorage.setItem('shopease_shipping_address', address.trim());

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backgroundColor: 'rgba(20, 32, 16, 0.55)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.2s ease-out forwards',
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid var(--border-light)',
        boxShadow: '0 24px 60px -15px rgba(28, 42, 20, 0.22)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Modal Header */}
        <div style={{
          padding: '1.5rem 1.75rem 1.25rem',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #fbf9f5 0%, #ffffff 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Avatar Badge */}
            <div style={{
              position: 'relative',
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2e5e1c 0%, #3d7a28 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(46, 94, 28, 0.25)',
              border: '2px solid #ffffff',
            }}>
              {initials}
              <div style={{
                position: 'absolute',
                bottom: '1px',
                right: '1px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #ffffff',
              }} title="Active Member" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                }}>
                  {user.full_name}
                </h2>
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  background: user.role === 'admin' ? '#fef3c7' : '#eef6ea',
                  color: user.role === 'admin' ? '#b45309' : 'var(--green-700)',
                  border: user.role === 'admin' ? '1px solid #fde68a' : '1px solid #d9ebca',
                  textTransform: 'capitalize',
                }}>
                  {user.role === 'admin' ? 'Administrator' : 'Verified Member'}
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close user profile"
            style={{
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: 'none',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-muted)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          padding: '0 1.75rem',
          borderBottom: '1px solid var(--border-light)',
          background: '#ffffff',
          gap: '1.5rem',
        }}>
          {[
            { id: 'details', label: 'Profile Details', icon: <UserIcon style={{ width: '14px', height: '14px' }} /> },
            { id: 'orders', label: `My Orders (${orders.length})`, icon: <Package style={{ width: '14px', height: '14px' }} /> },
            { id: 'perks', label: 'Membership & Perks', icon: <Award style={{ width: '14px', height: '14px' }} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.85rem 0',
                fontSize: '0.8125rem',
                fontWeight: activeTab === tab.id ? 600 : 500,
                color: activeTab === tab.id ? 'var(--green-600)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid var(--green-600)' : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.75rem',
        }}>

          {/* TAB 1: Profile Details */}
          {activeTab === 'details' && (
            <form onSubmit={handleSaveProfile}>
              {saveSuccess && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  color: '#15803d',
                  fontSize: '0.8125rem',
                  marginBottom: '1.25rem',
                }}>
                  <Check style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  Profile details updated successfully!
                </div>
              )}

              {errorMsg && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '0.8125rem',
                  marginBottom: '1.25rem',
                }}>
                  <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.85rem 0.625rem 2.25rem',
                        fontSize: '0.875rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-mid)',
                        background: '#ffffff',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <UserIcon style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '14px',
                      height: '14px',
                      color: 'var(--text-light)',
                    }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.85rem 0.625rem 2.25rem',
                        fontSize: '0.875rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-mid)',
                        background: '#ffffff',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Mail style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '14px',
                      height: '14px',
                      color: 'var(--text-light)',
                    }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Contact Phone
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.85rem 0.625rem 2.25rem',
                        fontSize: '0.875rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-mid)',
                        background: '#ffffff',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Phone style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '14px',
                      height: '14px',
                      color: 'var(--text-light)',
                    }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Account Role
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.role === 'admin' ? 'System Administrator' : 'Verified Organic Buyer'}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.85rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-muted)',
                      color: 'var(--text-muted)',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Default Shipping Address
                </label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.85rem 0.625rem 2.25rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-mid)',
                      background: '#ffffff',
                      color: 'var(--text-primary)',
                      resize: 'none',
                    }}
                  />
                  <MapPin style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '0.85rem',
                    width: '14px',
                    height: '14px',
                    color: 'var(--text-light)',
                  }} />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  onClick={onLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8125rem',
                    color: '#dc2626',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  <LogOut style={{ width: '14px', height: '14px' }} />
                  Sign Out from Account
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.35rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #2e5e1c 0%, #3d7a28 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(46, 94, 28, 0.2)',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Order History */}
          {activeTab === 'orders' && (
            <div>
              {loadingOrders ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Loading your past orders...
                </div>
              ) : orders.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  border: '1px dashed var(--border-light)',
                  borderRadius: '12px',
                  background: 'var(--bg-muted)',
                }}>
                  <Package style={{ width: '36px', height: '36px', color: 'var(--text-light)', margin: '0 auto 0.75rem' }} />
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    No past orders yet
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Your purchased items and delivery tracking records will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {orders.map((ord) => {
                    const statusColor = ord.fulfillment_status === 'delivered' 
                      ? { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }
                      : ord.fulfillment_status === 'shipped'
                      ? { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }
                      : { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };

                    return (
                      <div
                        key={ord.order_number}
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--border-light)',
                          borderRadius: '12px',
                          padding: '1.125rem 1.25rem',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                          <div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {ord.order_number}
                            </span>
                            <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              Placed on {ord.created_at ? new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px',
                              background: statusColor.bg,
                              color: statusColor.text,
                              border: `1px solid ${statusColor.border}`,
                              textTransform: 'capitalize',
                            }}>
                              {ord.fulfillment_status}
                            </span>
                            <button
                              onClick={() => {
                                onClose();
                                onTrackOrder(ord.order_number);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--green-600)',
                                background: '#f0f6ea',
                                border: '1px solid #d9ebca',
                                borderRadius: '6px',
                                padding: '0.25rem 0.6rem',
                                cursor: 'pointer',
                              }}
                            >
                              Track
                              <ChevronRight style={{ width: '12px', height: '12px' }} />
                            </button>
                          </div>
                        </div>

                        {/* Items list preview */}
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          padding: '0.5rem 0',
                          borderTop: '1px dashed var(--border-light)',
                          borderBottom: '1px dashed var(--border-light)',
                          margin: '0.5rem 0',
                        }}>
                          {ord.items?.slice(0, 3).map((item, idx) => (
                            <span key={idx} style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-muted)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                            }}>
                              {item.product_name} × {item.quantity}
                            </span>
                          ))}
                          {ord.items && ord.items.length > 3 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.2rem' }}>
                              +{ord.items.length - 3} more items
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>
                            Payment: {ord.payment_method?.toUpperCase()} · {ord.payment_status}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                            {currencySymbol}{ord.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Membership & Perks */}
          {activeTab === 'perks' && (
            <div>
              {/* Member Card */}
              <div style={{
                background: 'linear-gradient(135deg, #1f4212 0%, #2e5e1c 50%, #3d7a28 100%)',
                color: '#ffffff',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 8px 24px -4px rgba(46, 94, 28, 0.3)',
                marginBottom: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                }} />
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck style={{ width: '20px', height: '20px', color: '#a7f3d0' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#d1fae5' }}>
                      ShopScape Organic Club
                    </span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', background: 'rgba(255, 255, 255, 0.2)', fontWeight: 600 }}>
                    Active Tier
                  </span>
                </div>

                <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.02em', marginBottom: '0.35rem' }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a7f3d0', opacity: 0.9 }}>
                  Member ID: SC-ORG-{user.id.toString().padStart(6, '0')}
                </div>
              </div>

              {/* Exclusive Perks List */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  background: '#fcfdfb',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      🎟️
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        10% Welcome Discount Voucher
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>
                        Apply coupon at checkout on your orders
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyCouponCode('WELCOME10')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      background: copiedCoupon ? '#f0fdf4' : '#ffffff',
                      border: copiedCoupon ? '1px solid #86efac' : '1px solid var(--border-mid)',
                      color: copiedCoupon ? '#15803d' : 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedCoupon ? <Check style={{ width: '12px', height: '12px' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
                    {copiedCoupon ? 'Copied!' : 'WELCOME10'}
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  background: '#ffffff',
                }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eef6ea', color: 'var(--green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🚚
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Free Cold-Chain Shipping
                    </div>
                    <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>
                      Unlocked automatically on orders over {currencySymbol}999
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  background: '#ffffff',
                }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🤖
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      AI Shopping Assistant Concierge
                    </div>
                    <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>
                      Personalized grocery lists, recipe suggestions & nutrition guides
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
