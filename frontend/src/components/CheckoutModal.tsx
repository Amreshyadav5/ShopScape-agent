import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Truck,
  ArrowRight,
  ArrowLeft,
  Package,
  MapPin,
  Building,
  Home,
  Check,
  Copy,
  Lock,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Clock,
  Phone,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import type { Cart, User, Order } from '../types';
import { api } from '../api';
import { formatPrice, resolveImageUrl } from '../utils';

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Office' | 'Other';
  name: string;
  email: string;
  phone: string;
  house: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

interface CheckoutModalProps {
  isOpen: boolean;
  cart: Cart | null;
  user: User | null;
  currencySymbol?: string;
  freeShippingThreshold?: number;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
  onViewOrderTracking: (orderNumber: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  user,
  currencySymbol = '₹',
  freeShippingThreshold = 999,
  onClose,
  onOrderSuccess,
  onViewOrderTracking,
}) => {
  // Checkout Steps: delivery -> payment -> review
  const [step, setStep] = useState<'delivery' | 'payment' | 'review'>('delivery');

  // Delivery Form State
  const [name, setName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [house, setHouse] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  const [orderNotes, setOrderNotes] = useState('');

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');

  // Payment Method State: 'sandbox' (Test Card), 'cod' (Cash on Delivery), 'razorpay' (UPI / Online)
  const [paymentMethod, setPaymentMethod] = useState<'sandbox' | 'cod' | 'razorpay'>('sandbox');

  // Form Validation & Process State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);

  // Address storage key
  const storageKey = `shopease_addresses_${user?.id || 'guest'}`;

  // Initialize and load saved addresses when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Reset step & error state on reopen (if not showing a newly completed order)
    if (!completedOrder) {
      setStep('delivery');
      setGeneralError(null);
      setErrors({});
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: SavedAddress[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedAddresses(parsed);
          const defaultAddr = parsed.find((a) => a.isDefault) || parsed[0];
          setSelectedAddressId(defaultAddr.id);
          applySavedAddress(defaultAddr);
          return;
        }
      }
    } catch {
      // Ignore local storage parse error
    }

    // Default to new address mode
    setSelectedAddressId('new');
    if (user) {
      setName(user.full_name || '');
      setEmail(user.email || '');
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, user, storageKey]);

  // Handle Escape key to close modal safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  // Apply a saved address to form inputs
  const applySavedAddress = (addr: SavedAddress) => {
    setName(addr.name);
    setEmail(addr.email);
    setPhone(addr.phone);
    setHouse(addr.house);
    setStreet(addr.street);
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
    setAddressLabel(addr.label);
    setErrors({});
  };

  const handleSelectAddressCard = (addrId: string) => {
    setSelectedAddressId(addrId);
    if (addrId === 'new') {
      setName(user?.full_name || '');
      setEmail(user?.email || '');
      setPhone('');
      setHouse('');
      setStreet('');
      setCity('');
      setState('');
      setPincode('');
      setAddressLabel('Home');
      setErrors({});
    } else {
      const found = savedAddresses.find((a) => a.id === addrId);
      if (found) {
        applySavedAddress(found);
      }
    }
  };

  // Field validation
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'name':
        return !value.trim() ? 'Full name is required' : '';
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address';
        return '';
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!/^\+?[0-9]{10,12}$/.test(value.trim().replace(/[\s-]/g, ''))) {
          return 'Enter a valid 10-digit mobile number';
        }
        return '';
      case 'house':
        return !value.trim() ? 'House / Flat / Building is required' : '';
      case 'street':
        return !value.trim() ? 'Street / Area / Landmark is required' : '';
      case 'city':
        return !value.trim() ? 'City is required' : '';
      case 'state':
        return !value.trim() ? 'State is required' : '';
      case 'pincode':
        if (!value.trim()) return 'PIN code is required';
        if (!/^\d{6}$/.test(value.trim())) return 'Enter a valid 6-digit PIN code';
        return '';
      default:
        return '';
    }
  };

  const validateAllDeliveryFields = (): boolean => {
    const newErrors: Record<string, string> = {
      name: validateField('name', name),
      email: validateField('email', email),
      phone: validateField('phone', phone),
      house: validateField('house', house),
      street: validateField('street', street),
      city: validateField('city', city),
      state: validateField('state', state),
      pincode: validateField('pincode', pincode),
    };

    // Remove empty error strings
    Object.keys(newErrors).forEach((key) => {
      if (!newErrors[key]) delete newErrors[key];
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save current address to local storage
  const persistAddressIfRequested = () => {
    if (!saveAddressForFuture) return;
    try {
      const newAddr: SavedAddress = {
        id: `addr-${Date.now()}`,
        label: addressLabel,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        house: house.trim(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        isDefault: savedAddresses.length === 0,
      };

      const updated = [newAddr, ...savedAddresses.filter((a) => a.phone !== newAddr.phone || a.house !== newAddr.house)];
      setSavedAddresses(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // Storage quota or privacy mode fail safe
    }
  };

  // Step 1 -> Step 2
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!cart || cart.items.length === 0) {
      setGeneralError('Your cart is empty. Please add items before checking out.');
      return;
    }

    if (!validateAllDeliveryFields()) {
      setGeneralError('Please fill in all required delivery fields correctly.');
      return;
    }

    if (selectedAddressId === 'new') {
      persistAddressIfRequested();
    }

    setStep('payment');
  };

  // Step 2 -> Step 3
  const handleProceedToReview = () => {
    setGeneralError(null);
    setStep('review');
  };

  // Step 3 -> Order Submission
  const handleFinalSubmit = async () => {
    if (!cart || cart.items.length === 0) {
      setGeneralError('Your cart is empty');
      return;
    }

    if (!validateAllDeliveryFields()) {
      setStep('delivery');
      setGeneralError('Please verify your delivery address.');
      return;
    }

    setGeneralError(null);
    setLoading(true);

    const fullShippingAddress = `${house.trim()}, ${street.trim()}, ${city.trim()}, ${state.trim()} - ${pincode.trim()}`;

    try {
      const order = await api.checkout({
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim(),
        shipping_address: fullShippingAddress,
        payment_method: paymentMethod,
        coupon_code: cart.coupon_code,
        notes: orderNotes.trim() || undefined,
      });

      setCompletedOrder(order);
      onOrderSuccess(order);
    } catch (err: any) {
      setGeneralError(err.message || 'Checkout failed. Please review your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy order number to clipboard
  const handleCopyOrderNumber = () => {
    if (!completedOrder) return;
    navigator.clipboard.writeText(completedOrder.order_number);
    setCopiedOrderNumber(true);
    setTimeout(() => setCopiedOrderNumber(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-stone-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      <div
        className="relative w-full max-w-4xl lg:max-w-5xl bg-white border border-[#e8e4dc] sm:rounded-2xl lg:rounded-3xl shadow-2xl flex flex-col h-[92vh] sm:h-[85vh] max-h-[800px] text-[#1a2e22] my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================================
            TOP HEADER WITH STEPPER & CLOSE
        ========================================================================== */}
        <div className="flex-none px-6 py-4 sm:px-8 sm:py-4.5 border-b border-[#e8e4dc] bg-[#faf8f5] flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eaf3ed] text-[#059669] flex items-center justify-center border border-[#cbe2d3] flex-shrink-0 shadow-xs">
              {completedOrder ? <CheckCircle2 className="w-5 h-5 text-[#059669]" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="checkout-modal-title" className="font-serif text-xl sm:text-2xl font-medium text-[#1a2e22]">
                  {completedOrder ? 'Order Confirmed' : 'Checkout'}
                </h2>
                <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-[#059669]/10 text-[#059669]">
                  {completedOrder ? 'Receipt Ready' : 'Secure 256-Bit'}
                </span>
              </div>
              <p className="text-xs text-[#556b5d] hidden sm:block">
                {completedOrder
                  ? 'Your order has been placed and confirmed with verified inventory'
                  : 'Delivery details, payment method & order review'}
              </p>
            </div>
          </div>

          {/* Stepper (Only shown during active checkout, hidden on success) */}
          {!completedOrder && (
            <div className="hidden md:flex items-center gap-2 text-xs font-medium">
              {/* Step 1 Pill */}
              <button
                type="button"
                onClick={() => setStep('delivery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  step === 'delivery'
                    ? 'bg-[#059669] text-white shadow-xs'
                    : 'bg-[#ede8df] text-[#1a2e22] hover:bg-[#e2ddd3]'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Delivery</span>
              </button>

              <span className="text-[#a49f95]">→</span>

              {/* Step 2 Pill */}
              <button
                type="button"
                onClick={() => {
                  if (validateAllDeliveryFields()) setStep('payment');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  step === 'payment'
                    ? 'bg-[#059669] text-white shadow-xs'
                    : step === 'review'
                    ? 'bg-[#ede8df] text-[#1a2e22] hover:bg-[#e2ddd3] cursor-pointer'
                    : 'bg-transparent text-[#7a8a80] cursor-not-allowed'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Payment</span>
              </button>

              <span className="text-[#a49f95]">→</span>

              {/* Step 3 Pill */}
              <button
                type="button"
                onClick={() => {
                  if (validateAllDeliveryFields()) setStep('review');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  step === 'review'
                    ? 'bg-[#059669] text-white shadow-xs'
                    : 'bg-transparent text-[#7a8a80] cursor-not-allowed'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Review</span>
              </button>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white hover:bg-[#ede8df] text-[#556b5d] hover:text-[#1a2e22] transition-colors border border-[#e8e4dc]"
            aria-label="Close checkout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =========================================================================
            MAIN SCROLLABLE BODY AREA
        ========================================================================== */}
        <div className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 ${completedOrder ? 'flex flex-col items-center justify-center' : ''}`}>
          {completedOrder ? (
            /* =====================================================================
               ORDER CONFIRMED SUCCESS VIEW
            ====================================================================== */
            <div className="w-full max-w-xl mx-auto py-2 sm:py-4 text-center">
              <div className="w-16 h-16 bg-[#eaf3ed] text-[#059669] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#cbe2d3] shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#059669]/10 text-[#059669] text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Fresh Order</span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#1a2e22] mb-1.5">
                Order Confirmed!
              </h3>
              <p className="text-xs sm:text-sm text-[#556b5d] mb-5 max-w-md mx-auto">
                Thank you for shopping with ShopScape. Your order has been placed successfully and is being packed with fresh farm-direct items in biodegradable packaging.
              </p>

              {/* Order Details Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#faf8f5] border border-[#e8e4dc] text-left max-w-xl mx-auto mb-6 text-sm space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#e8e4dc]">
                  <span className="text-xs font-medium text-[#7a8a80]">Order Reference</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#059669] bg-white px-2.5 py-1 rounded-md border border-[#cbe2d3]">
                      {completedOrder.order_number}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOrderNumber}
                      title="Copy order number"
                      className="p-1 text-[#556b5d] hover:text-[#1a2e22] transition-colors"
                    >
                      {copiedOrderNumber ? <Check className="w-4 h-4 text-[#059669]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs py-1">
                  <div>
                    <span className="text-[#7a8a80] block mb-0.5">Total Paid / Payable</span>
                    <span className="font-semibold text-base text-[#1a2e22]">
                      {formatPrice(completedOrder.total_amount, currencySymbol)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7a8a80] block mb-0.5">Payment Status</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-medium capitalize text-xs ${
                        completedOrder.payment_status === 'paid'
                          ? 'bg-[#eaf3ed] text-[#059669] border border-[#cbe2d3]'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {completedOrder.payment_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7a8a80] block mb-0.5">Payment Method</span>
                    <span className="font-medium text-[#1a2e22] capitalize">
                      {completedOrder.payment_method === 'sandbox'
                        ? 'Test Card (Sandbox)'
                        : completedOrder.payment_method === 'cod'
                        ? 'Cash on Delivery'
                        : 'UPI / Online'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7a8a80] block mb-0.5">Fulfillment</span>
                    <span className="inline-block px-2 py-0.5 rounded font-medium bg-[#f0f4f1] text-[#2d5a3d]">
                      {completedOrder.fulfillment_status}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#e8e4dc]">
                  <span className="text-[#7a8a80] text-xs block mb-1">Delivering to</span>
                  <p className="text-[#1a2e22] text-xs font-medium leading-relaxed">
                    {completedOrder.customer_name} · {completedOrder.shipping_address}
                  </p>
                </div>

                {completedOrder.items && completedOrder.items.length > 0 && (
                  <div className="pt-3 border-t border-[#e8e4dc]">
                    <span className="text-[#7a8a80] text-xs block mb-2">
                      Items Ordered ({completedOrder.items.length})
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {completedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-1">
                          <span className="text-[#1a2e22] truncate max-w-[280px]">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="font-medium text-[#556b5d]">
                            {formatPrice(item.total_price, currencySymbol)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewOrderTracking(completedOrder.order_number);
                  }}
                  className="px-6 py-3 bg-[#059669] hover:bg-[#047857] text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>Track Order Status</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-white hover:bg-[#faf8f5] text-[#1a2e22] font-medium text-sm rounded-xl border border-[#e8e4dc] transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            /* =====================================================================
               ACTIVE CHECKOUT FLOW (2-COLUMN RESPONSIVE LAYOUT)
            ====================================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* LEFT COLUMN: ACTIVE STEP CONTENT (~62% WIDTH) */}
              <div className="lg:col-span-7 space-y-6">
                {/* General Error Alert */}
                {generalError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-shake">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                    <div className="flex-1">
                      <span className="font-semibold block">Checkout Note</span>
                      <span>{generalError}</span>
                    </div>
                  </div>
                )}

                {/* -----------------------------------------------------------------
                    STEP 1: DELIVERY ADDRESS
                ------------------------------------------------------------------ */}
                {step === 'delivery' && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-[#e8e4dc]">
                      <div className="w-8 h-8 rounded-lg bg-[#eaf3ed] text-[#059669] flex items-center justify-center border border-[#cbe2d3]">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-medium text-[#1a2e22]">
                          Delivery Address
                        </h3>
                        <p className="text-xs text-[#556b5d]">
                          Where should we deliver your order?
                        </p>
                      </div>
                    </div>

                    {/* Saved Addresses List (if available) */}
                    {savedAddresses.length > 0 && (
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-[#556b5d] uppercase tracking-wider">
                          Select a Saved Address
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {savedAddresses.map((addr) => (
                            <div
                              key={addr.id}
                              onClick={() => handleSelectAddressCard(addr.id)}
                              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all relative ${
                                selectedAddressId === addr.id
                              ? 'border-[#059669] bg-[#f0fdf4] ring-1 ring-[#059669]'
                              : 'border-[#e8e4dc] bg-white hover:border-[#cbd5e1]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  {addr.label === 'Home' ? (
                                    <Home className="w-3.5 h-3.5 text-[#059669]" />
                                  ) : (
                                    <Building className="w-3.5 h-3.5 text-[#059669]" />
                                  )}
                                  <span className="font-semibold text-xs text-[#1a2e22]">
                                    {addr.label}
                                  </span>
                                </div>
                                {addr.isDefault && (
                                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#eaf3ed] text-[#059669]">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="font-medium text-xs text-[#1a2e22] truncate">{addr.name}</p>
                              <p className="text-[11px] text-[#556b5d] line-clamp-2 leading-relaxed">
                                {addr.house}, {addr.street}, {addr.city} - {addr.pincode}
                              </p>
                              <p className="text-[10px] text-[#7a8a80] mt-1 font-mono">
                                📞 {addr.phone}
                              </p>
                            </div>
                          ))}

                          {/* Option to Add New Address */}
                          <div
                            onClick={() => handleSelectAddressCard('new')}
                            className={`p-3.5 rounded-xl border border-dashed text-center flex flex-col items-center justify-center cursor-pointer transition-all min-h-[90px] ${
                              selectedAddressId === 'new'
                                ? 'border-[#059669] bg-[#f0fdf4] ring-1 ring-[#059669]'
                                : 'border-[#d0cbc2] bg-[#faf8f5] hover:border-[#059669]'
                            }`}
                          >
                            <span className="text-xs font-semibold text-[#059669] block mb-0.5">
                              + Enter New Address
                            </span>
                            <span className="text-[10px] text-[#7a8a80]">
                              Type custom delivery details
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Address Form (Shown always when 'new' selected, or allows editing selected address) */}
                    <form onSubmit={handleProceedToPayment} className="space-y-4 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Full Name */}
                        <div>
                          <label className="block text-xs font-medium text-[#1a2e22] mb-1.5">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => {
                                setName(e.target.value);
                                if (errors.name) setErrors({ ...errors, name: '' });
                              }}
                              placeholder="Alex Sharma"
                              className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs text-[#1a2e22] placeholder:text-[#a49f95] transition-all focus:outline-none focus:ring-2 ${
                                errors.name
                                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                  : 'border-[#e2e0d8] focus:border-[#059669] focus:ring-[#059669]/15'
                              }`}
                            />
                            <UserIcon className="w-4 h-4 text-[#a49f95] absolute right-3 top-3.5 pointer-events-none" />
                          </div>
                          {errors.name && (
                            <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>
                          )}
                        </div>

                        {/* Email Address */}
                        <div>
                          <label className="block text-xs font-medium text-[#1a2e22] mb-1.5">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                if (errors.email) setErrors({ ...errors, email: '' });
                              }}
                              placeholder="alex@example.com"
                              className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs text-[#1a2e22] placeholder:text-[#a49f95] transition-all focus:outline-none focus:ring-2 ${
                                errors.email
                                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                  : 'border-[#e2e0d8] focus:border-[#059669] focus:ring-[#059669]/15'
                              }`}
                            />
                            <Mail className="w-4 h-4 text-[#a49f95] absolute right-3 top-3.5 pointer-events-none" />
                          </div>
                          {errors.email && (
                            <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Phone Number */}
                        <div>
                          <label className="block text-xs font-medium text-[#1a2e22] mb-1.5">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => {
                                setPhone(e.target.value);
                                if (errors.phone) setErrors({ ...errors, phone: '' });
                              }}
                              placeholder="9876543210"
                              className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs text-[#1a2e22] placeholder:text-[#a49f95] transition-all focus:outline-none focus:ring-2 ${
                                errors.phone
                                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                  : 'border-[#e2e0d8] focus:border-[#059669] focus:ring-[#059669]/15'
                              }`}
                            />
                            <Phone className="w-4 h-4 text-[#a49f95] absolute right-3 top-3.5 pointer-events-none" />
                          </div>
                          {errors.phone && (
                            <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>
                          )}
                        </div>

                        {/* House / Flat / Building */}
                        <div>
                          <label className="block text-xs font-medium text-[#1a2e22] mb-1.5">
                            House / Flat / Building <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={house}
                            onChange={(e) => {
                              setHouse(e.target.value);
                              if (errors.house) setErrors({ ...errors, house: '' });
                            }}
                            placeholder="Flat 402, Green Meadows"
                            className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs text-[#1a2e22] placeholder:text-[#a49f95] transition-all focus:outline-none focus:ring-2 ${
                              errors.house
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-[#e2e0d8] focus:border-[#059669] focus:ring-[#059669]/15'
                            }`}
                          />
                          {errors.house && (
                            <p className="text-[11px] text-red-600 mt-1">{errors.house}</p>
                          )}
                        </div>
                      </div>

                      {/* Street / Area / Landmark */}
                      <div>
                        <label className="block text-xs font-medium text-[#1a2e22] mb-1.5">
                          Street / Area / Landmark <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={street}
                          onChange={(e) => {
                            setStreet(e.target.value);
                            if (errors.street) setErrors({ ...errors, street: '' });
                          }}
                          placeholder="100 Feet Road, Near Metro Station"
                          className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs text-[#1a2e22] placeholder:text-[#a49f95] transition-all focus:outline-none focus:ring-2 ${
                            errors.street
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                              : 'border-[#e2e0d8] focus:border-[#059669] focus:ring-[#059669]/15'
                          }`}
                        />
                        {errors.street && (
                          <p className="text-[11px] text-red-600 mt-1">{errors.street}</p>
                        )}
                      </div>

                      {/* City, State, PIN */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#1a2e22] mb-1.5">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => {
                              setCity(e.target.value);
                              if (errors.city) setErrors({ ...errors, city: '' });
                            }}
                            placeholder="Bengaluru"
                            className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs text-[#1a2e22] placeholder:text-[#a49f95] transition-all focus:outline-none focus:ring-2 ${
                              errors.city
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-[#e2e0d8] focus:border-[#059669] focus:ring-[#059669]/15'
                            }`}
                          />
                          {errors.city && (
                            <p className="text-[11px] text-red-600 mt-1">{errors.city}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#1a2e22] mb-1.5">
                            State <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={state}
                            onChange={(e) => {
                              setState(e.target.value);
                              if (errors.state) setErrors({ ...errors, state: '' });
                            }}
                            placeholder="Karnataka"
                            className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs text-[#1a2e22] placeholder:text-[#a49f95] transition-all focus:outline-none focus:ring-2 ${
                              errors.state
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-[#e2e0d8] focus:border-[#059669] focus:ring-[#059669]/15'
                            }`}
                          />
                          {errors.state && (
                            <p className="text-[11px] text-red-600 mt-1">{errors.state}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#1a2e22] mb-1.5">
                            PIN Code <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={pincode}
                            onChange={(e) => {
                              setPincode(e.target.value);
                              if (errors.pincode) setErrors({ ...errors, pincode: '' });
                            }}
                            placeholder="560038"
                            className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs text-[#1a2e22] placeholder:text-[#a49f95] transition-all focus:outline-none focus:ring-2 ${
                              errors.pincode
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-[#e2e0d8] focus:border-[#059669] focus:ring-[#059669]/15'
                            }`}
                          />
                          {errors.pincode && (
                            <p className="text-[11px] text-red-600 mt-1">{errors.pincode}</p>
                          )}
                        </div>
                      </div>

                      {/* Address Type and Save Checkbox */}
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-[#556b5d] font-medium">Save as:</span>
                          {(['Home', 'Office', 'Other'] as const).map((lbl) => (
                            <label
                              key={lbl}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                                addressLabel === lbl
                                  ? 'border-[#059669] bg-[#eaf3ed] text-[#059669] font-semibold'
                                  : 'border-[#e2e0d8] text-[#556b5d] hover:bg-[#faf8f5]'
                              }`}
                            >
                              <input
                                type="radio"
                                name="addressLabel"
                                value={lbl}
                                checked={addressLabel === lbl}
                                onChange={() => setAddressLabel(lbl)}
                                className="sr-only"
                              />
                              <span>{lbl}</span>
                            </label>
                          ))}
                        </div>

                        <label className="inline-flex items-center gap-2 cursor-pointer text-[#556b5d]">
                          <input
                            type="checkbox"
                            checked={saveAddressForFuture}
                            onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                            className="rounded border-[#e2e0d8] text-[#059669] focus:ring-[#059669]"
                          />
                          <span>Save address to address book</span>
                        </label>
                      </div>
                    </form>
                  </div>
                )}

                {/* -----------------------------------------------------------------
                    STEP 2: PAYMENT METHOD
                ------------------------------------------------------------------ */}
                {step === 'payment' && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-[#e8e4dc]">
                      <div className="w-8 h-8 rounded-lg bg-[#eaf3ed] text-[#059669] flex items-center justify-center border border-[#cbe2d3]">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-medium text-[#1a2e22]">
                          Payment Method
                        </h3>
                        <p className="text-xs text-[#556b5d]">
                          Select your preferred payment option
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* 1. Test Card / Sandbox Card */}
                      <div
                        onClick={() => setPaymentMethod('sandbox')}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          paymentMethod === 'sandbox'
                            ? 'border-[#059669] bg-[#f0fdf4] ring-1 ring-[#059669] shadow-xs'
                            : 'border-[#e8e4dc] bg-white hover:border-[#cbd5e1]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#eaf3ed] text-[#059669] flex items-center justify-center border border-[#cbe2d3] flex-shrink-0 mt-0.5">
                              <CreditCard className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm text-[#1a2e22]">
                                  Test Payment (Sandbox)
                                </h4>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  Test Mode
                                </span>
                              </div>
                              <p className="text-xs text-[#556b5d] mt-1 leading-relaxed">
                                Instant authorization without real credit card charges. Designed for test demonstration and verification.
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-[11px] text-[#059669] font-medium">
                                <span>✓ Instant Approval</span>
                                <span>✓ Zero Deductions</span>
                                <span>✓ Full Receipt</span>
                              </div>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 ${
                              paymentMethod === 'sandbox'
                                ? 'border-[#059669] bg-[#059669] text-white'
                                : 'border-[#d0cbc2]'
                            }`}
                          >
                            {paymentMethod === 'sandbox' && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>

                      {/* 2. Cash on Delivery (COD) */}
                      <div
                        onClick={() => setPaymentMethod('cod')}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          paymentMethod === 'cod'
                            ? 'border-[#059669] bg-[#f0fdf4] ring-1 ring-[#059669] shadow-xs'
                            : 'border-[#e8e4dc] bg-white hover:border-[#cbd5e1]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#ede8df] text-[#556b5d] flex items-center justify-center border border-[#e0dad0] flex-shrink-0 mt-0.5">
                              <Banknote className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm text-[#1a2e22]">
                                  Cash on Delivery
                                </h4>
                                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                                  Pay Upon Arrival
                                </span>
                              </div>
                              <p className="text-xs text-[#556b5d] mt-1 leading-relaxed">
                                Pay with cash or UPI QR code when our delivery courier hands over your eco-friendly package.
                              </p>
                              <p className="text-[11px] text-[#7a8a80] mt-1.5">
                                Verified phone number required for delivery dispatch.
                              </p>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 ${
                              paymentMethod === 'cod'
                                ? 'border-[#059669] bg-[#059669] text-white'
                                : 'border-[#d0cbc2]'
                            }`}
                          >
                            {paymentMethod === 'cod' && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>

                      {/* 3. UPI / Online Gateway */}
                      <div
                        onClick={() => setPaymentMethod('razorpay')}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          paymentMethod === 'razorpay'
                            ? 'border-[#059669] bg-[#f0fdf4] ring-1 ring-[#059669] shadow-xs'
                            : 'border-[#e8e4dc] bg-white hover:border-[#cbd5e1]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#ede8df] text-[#556b5d] flex items-center justify-center border border-[#e0dad0] flex-shrink-0 mt-0.5">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm text-[#1a2e22]">
                                  UPI / Online Payment
                                </h4>
                                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  Secured Online
                                </span>
                              </div>
                              <p className="text-xs text-[#556b5d] mt-1 leading-relaxed">
                                Pay securely online with Google Pay, PhonePe, Paytm, Credit / Debit Cards, or NetBanking.
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-medium bg-white px-2 py-0.5 rounded border border-[#e0dad0] text-[#556b5d]">
                                  UPI
                                </span>
                                <span className="text-[10px] font-medium bg-white px-2 py-0.5 rounded border border-[#e0dad0] text-[#556b5d]">
                                  GPay
                                </span>
                                <span className="text-[10px] font-medium bg-white px-2 py-0.5 rounded border border-[#e0dad0] text-[#556b5d]">
                                  Cards
                                </span>
                                <span className="text-[10px] font-medium bg-white px-2 py-0.5 rounded border border-[#e0dad0] text-[#556b5d]">
                                  NetBanking
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 ${
                              paymentMethod === 'razorpay'
                                ? 'border-[#059669] bg-[#059669] text-white'
                                : 'border-[#d0cbc2]'
                            }`}
                          >
                            {paymentMethod === 'razorpay' && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trust footer note */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#faf8f5] border border-[#e8e4dc] text-[11px] text-[#556b5d]">
                      <Lock className="w-4 h-4 text-[#059669] flex-shrink-0" />
                      <span>
                        All payment methods are protected by bank-grade 256-bit SSL encryption. We never store raw card numbers.
                      </span>
                    </div>
                  </div>
                )}

                {/* -----------------------------------------------------------------
                    STEP 3: REVIEW & CONFIRM ORDER
                ------------------------------------------------------------------ */}
                {step === 'review' && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-[#e8e4dc]">
                      <div className="w-8 h-8 rounded-lg bg-[#eaf3ed] text-[#059669] flex items-center justify-center border border-[#cbe2d3]">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-medium text-[#1a2e22]">
                          Review & Place Order
                        </h3>
                        <p className="text-xs text-[#556b5d]">
                          Please verify your address and details before confirming
                        </p>
                      </div>
                    </div>

                    {/* Review Address Card */}
                    <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#e8e4dc] flex items-start justify-between gap-4">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-[#1a2e22] text-sm">{name}</span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-[#eaf3ed] text-[#059669]">
                            {addressLabel}
                          </span>
                        </div>
                        <p className="text-[#556b5d] leading-relaxed">
                          {house}, {street}, {city}, {state} - {pincode}
                        </p>
                        <p className="text-[#7a8a80] pt-1">
                          📞 {phone} · ✉️ {email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep('delivery')}
                        className="text-xs font-semibold text-[#059669] hover:underline flex-shrink-0 px-2.5 py-1 rounded-lg border border-[#cbe2d3] bg-white cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Review Payment Card */}
                    <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#e8e4dc] flex items-start justify-between gap-4">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-[#059669]" />
                          <span className="font-bold text-[#1a2e22] text-sm">
                            {paymentMethod === 'sandbox'
                              ? 'Test Card (Sandbox Simulation)'
                              : paymentMethod === 'cod'
                              ? 'Cash on Delivery (COD)'
                              : 'UPI / Online Payment'}
                          </span>
                        </div>
                        <p className="text-[#556b5d]">
                          {paymentMethod === 'sandbox'
                            ? 'Instant verification with zero actual deduction.'
                            : paymentMethod === 'cod'
                            ? 'Pay with cash or UPI QR upon courier arrival.'
                            : 'Secure payment via online checkout gateway.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep('payment')}
                        className="text-xs font-semibold text-[#059669] hover:underline flex-shrink-0 px-2.5 py-1 rounded-lg border border-[#cbe2d3] bg-white cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Optional Delivery Instructions / Notes */}
                    <div>
                      <label className="block text-xs font-medium text-[#1a2e22] mb-1.5">
                        Delivery Notes / Gate Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="e.g. Please leave with building security, or call on arrival"
                        className="w-full h-11 px-3.5 bg-white border border-[#e2e0d8] rounded-xl text-xs text-[#1a2e22] placeholder:text-[#a49f95] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: DEDICATED ORDER SUMMARY CARD (~38% WIDTH) */}
              <div className="lg:col-span-5 bg-[#faf8f5] border border-[#e8e4dc] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#e8e4dc]">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#059669]" />
                    <h4 className="font-serif text-base font-semibold text-[#1a2e22]">
                      Order Summary
                    </h4>
                  </div>
                  <span className="text-xs font-medium text-[#556b5d] bg-white px-2.5 py-0.5 rounded-full border border-[#e8e4dc]">
                    {cart?.items.length || 0} items
                  </span>
                </div>

                {/* Cart Items List */}
                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {cart?.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-xl bg-white border border-[#e8e4dc] text-xs"
                    >
                      <img
                        src={resolveImageUrl(item.product_image)}
                        alt={item.product_name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-[#f0ece3]"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-[#1a2e22] truncate text-xs">
                          {item.product_name}
                        </h5>
                        <p className="text-[11px] text-[#7a8a80] mt-0.5">
                          Qty: <span className="font-semibold text-[#1a2e22]">{item.quantity}</span> × {formatPrice(item.unit_price, currencySymbol)}
                        </p>
                      </div>
                      <span className="font-semibold text-xs text-[#1a2e22] flex-shrink-0">
                        {formatPrice(item.total_price, currencySymbol)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="pt-3 border-t border-[#e8e4dc] space-y-2 text-xs">
                  <div className="flex justify-between text-[#556b5d]">
                    <span>Items Subtotal</span>
                    <span className="font-medium text-[#1a2e22]">
                      {formatPrice(cart?.subtotal || 0, currencySymbol)}
                    </span>
                  </div>

                  {cart && cart.discount_amount > 0 && (
                    <div className="flex justify-between text-[#059669] font-medium">
                      <span>Discount ({cart.coupon_code})</span>
                      <span>-{formatPrice(cart.discount_amount, currencySymbol)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[#556b5d]">
                    <span>Delivery Fee</span>
                    <span className={cart?.shipping_fee === 0 ? 'text-[#059669] font-semibold' : 'font-medium text-[#1a2e22]'}>
                      {cart?.shipping_fee === 0 ? 'FREE' : formatPrice(cart?.shipping_fee || 0, currencySymbol)}
                    </span>
                  </div>

                  {cart && (
                    <div className="py-1 px-2.5 rounded-lg bg-[#eaf3ed] border border-[#cbe2d3] text-[11px] text-[#059669] font-medium flex items-center justify-between">
                      {cart.subtotal >= freeShippingThreshold ? (
                        <span>✓ Qualified for Free Standard Delivery</span>
                      ) : (
                        <span>
                          Add {formatPrice(freeShippingThreshold - cart.subtotal, currencySymbol)} more for Free Shipping
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between text-[#556b5d]">
                    <span>Estimated GST (5%)</span>
                    <span className="font-medium text-[#1a2e22]">
                      {formatPrice(cart?.tax_amount || 0, currencySymbol)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm font-semibold pt-2 border-t border-[#e8e4dc] text-[#1a2e22]">
                    <span>Total Payable</span>
                    <span className="text-base font-bold text-[#059669]">
                      {formatPrice(cart?.total_amount || 0, currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Delivery Note */}
                <div className="p-3 rounded-xl bg-white border border-[#e8e4dc] text-[11px] text-[#556b5d] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[#059669]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Estimated Delivery</span>
                  </div>
                  <p>In 2–3 business days with temperature-controlled biodegradable packaging.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            BOTTOM STICKY FOOTER ACTION BAR
        ========================================================================== */}
        {!completedOrder && (
          <div className="flex-none px-6 py-4 sm:px-8 sm:py-4.5 border-t border-[#e8e4dc] bg-[#faf8f5] flex items-center justify-between gap-4 z-10">
            {/* Back Button */}
            <div>
              {step === 'delivery' ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-5 rounded-xl border border-[#e8e4dc] bg-white hover:bg-[#ede8df] text-[#556b5d] hover:text-[#1a2e22] text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              ) : step === 'payment' ? (
                <button
                  type="button"
                  onClick={() => setStep('delivery')}
                  className="h-11 px-5 rounded-xl border border-[#e8e4dc] bg-white hover:bg-[#ede8df] text-[#1a2e22] text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Address</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep('payment')}
                  className="h-11 px-5 rounded-xl border border-[#e8e4dc] bg-white hover:bg-[#ede8df] text-[#1a2e22] text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Payment</span>
                </button>
              )}
            </div>

            {/* Next / Primary Action Button */}
            <div>
              {step === 'delivery' && (
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  className="h-11 px-6 sm:px-8 bg-[#059669] hover:bg-[#047857] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {step === 'payment' && (
                <button
                  type="button"
                  onClick={handleProceedToReview}
                  className="h-11 px-6 sm:px-8 bg-[#059669] hover:bg-[#047857] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Review Order</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {step === 'review' && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinalSubmit}
                  className="h-11 sm:h-12 px-6 sm:px-8 bg-[#059669] hover:bg-[#047857] disabled:bg-[#a49f95] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authorizing Order...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 flex-shrink-0" />
                      <span>Place Order — {formatPrice(cart?.total_amount || 0, currencySymbol)}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
