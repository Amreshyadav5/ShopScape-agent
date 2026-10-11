import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  AlertTriangle, 
  Tag, 
  Edit, 
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import type { AdminMetrics, Order, Product } from '../types';
import { api } from '../api';
import { formatPrice } from '../utils';

interface AdminDashboardProps {
  currencySymbol?: string;
  onBackToStore: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currencySymbol = '₹',
  onBackToStore,
}) => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'orders' | 'products' | 'coupons'>('metrics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update modal state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newFulfillmentStatus, setNewFulfillmentStatus] = useState('');
  const [newTrackingNumber, setNewTrackingNumber] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState(false);

  // Product edit state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [savingProduct, setSavingProduct] = useState(false);

  // New coupon state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newDiscountValue, setNewDiscountValue] = useState(15);
  const [newMinOrder, setNewMinOrder] = useState(500);
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, o, p, c] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminOrders(),
        api.getAdminProducts(),
        api.getAdminCoupons(),
      ]);
      setMetrics(m);
      setOrders(o);
      setProducts(p);
      setCoupons(c);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin dashboard. Ensure you have admin permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateOrderStatus = async () => {
    if (!editingOrder) return;
    setUpdatingOrder(true);
    try {
      await api.updateOrderStatus(editingOrder.id, {
        fulfillment_status: newFulfillmentStatus || undefined,
        tracking_number: newTrackingNumber || undefined,
      });
      setEditingOrder(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    setSavingProduct(true);
    try {
      await api.updateProduct(editingProduct.id, {
        price: editPrice,
        stock_quantity: editStock,
      });
      setEditingProduct(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    setCreatingCoupon(true);
    try {
      await api.createAdminCoupon(newCouponCode.trim().toUpperCase(), newDiscountValue, newMinOrder);
      setNewCouponCode('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon');
    } finally {
      setCreatingCoupon(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={onBackToStore}
            className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Storefront</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white">Business Administration Center</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Protected operations: real catalog pricing, live inventory control, order fulfillment, and promotions.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Metrics Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-8">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Total Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {formatPrice(metrics?.total_sales || 0, currencySymbol)}
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Total Orders</span>
                <ShoppingBag className="w-4 h-4 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white">{metrics?.total_orders || 0}</h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Avg Order Value</span>
                <DollarSign className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {formatPrice(metrics?.average_order_value || 0, currencySymbol)}
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Registered Users</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white">{metrics?.total_customers || 0}</h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Low Stock Alerts</span>
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">{metrics?.low_stock_products || 0}</h3>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 mb-6 gap-2">
            {[
              { id: 'metrics', label: 'Overview & Categories' },
              { id: 'orders', label: `Orders (${orders.length})` },
              { id: 'products', label: `Catalog & Stock (${products.length})` },
              { id: 'coupons', label: `Coupons (${coupons.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'metrics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h4 className="font-bold text-sm text-white mb-4">Revenue by Category</h4>
                {metrics?.sales_by_category && Object.keys(metrics.sales_by_category).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(metrics.sales_by_category).map(([cat, rev]) => (
                      <div key={cat} className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-semibold">{cat}</span>
                        <span className="font-mono text-emerald-400">{formatPrice(rev, currencySymbol)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No categorized sales yet.</p>
                )}
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h4 className="font-bold text-sm text-white mb-4">Store Security & Safety Safeguards</h4>
                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <strong className="text-emerald-400">Explicit Checkout Rule:</strong> AI Agent only prepares cart totals; payments require explicit user confirmation.
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <strong className="text-teal-400">Inventory Concurrency:</strong> Stock is safely deducted within database transactions during checkout.
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <strong className="text-amber-400">Role-Based Access:</strong> Admin routes verify password hashes and cryptographic JWT claims.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Orders */}
          {activeTab === 'orders' && (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h4 className="font-bold text-sm text-white">All Store Orders</h4>
                <span className="text-xs text-slate-400">{orders.length} transactions recorded</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Order Number</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Fulfillment</th>
                      <th className="p-3">Tracking</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-emerald-400">{ord.order_number}</td>
                        <td className="p-3 text-slate-200">
                          <div>{ord.customer_name}</div>
                          <div className="text-[10px] text-slate-500">{ord.customer_email}</div>
                        </td>
                        <td className="p-3 font-bold text-white">{formatPrice(ord.total_amount, currencySymbol)}</td>
                        <td className="p-3">
                          <span className="badge badge-organic capitalize">{ord.payment_status}</span>
                        </td>
                        <td className="p-3">
                          <span className="badge badge-amber capitalize">{ord.fulfillment_status}</span>
                        </td>
                        <td className="p-3 font-mono text-slate-400">{ord.tracking_number || '—'}</td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setEditingOrder(ord);
                              setNewFulfillmentStatus(ord.fulfillment_status);
                              setNewTrackingNumber(ord.tracking_number || '');
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-[11px]"
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Products */}
          {activeTab === 'products' && (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h4 className="font-bold text-sm text-white">Catalog Inventory</h4>
                <span className="text-xs text-slate-400">{products.length} active products</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Stock Qty</th>
                      <th className="p-3">Organic</th>
                      <th className="p-3">Rating</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-3 font-semibold text-white">{p.name}</td>
                        <td className="p-3 text-slate-400">{p.category}</td>
                        <td className="p-3 font-bold text-emerald-400">{formatPrice(p.price, currencySymbol)}</td>
                        <td className="p-3">
                          <span className={p.stock_quantity <= 5 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                            {p.stock_quantity}
                          </span>
                        </td>
                        <td className="p-3">
                          {p.is_organic ? (
                            <span className="badge badge-organic text-[10px]">Yes</span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                        <td className="p-3 text-amber-400">★ {p.average_rating ? p.average_rating.toFixed(1) : '4.5'}</td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setEditPrice(p.price);
                              setEditStock(p.stock_quantity);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-[11px] flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Coupons */}
          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h4 className="font-bold text-sm text-white mb-4">Create New Promotion</h4>
                <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Coupon Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FLASH25"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl uppercase text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Discount %</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={newDiscountValue}
                      onChange={(e) => setNewDiscountValue(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Min Order Value ({currencySymbol})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newMinOrder}
                      onChange={(e) => setNewMinOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creatingCoupon}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl mt-2 transition-colors"
                  >
                    {creatingCoupon ? 'Creating...' : 'Create Promo Code'}
                  </button>
                </form>
              </div>

              <div className="md:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <h4 className="font-bold text-sm text-white mb-4">Active Promo Codes</h4>
                <div className="space-y-2.5">
                  {coupons.map((c) => (
                    <div
                      key={c.id || c.code}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-400" />
                        <div>
                          <strong className="font-mono text-white text-sm">{c.code}</strong>
                          <span className="text-[11px] text-slate-400 block">
                            Min Order: {formatPrice(c.min_order_value || 0, currencySymbol)}
                          </span>
                        </div>
                      </div>
                      <span className="badge badge-organic text-xs">
                        {c.discount_value}% OFF
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Order Update Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-bold text-white text-base mb-1">
              Update Order #{editingOrder.order_number}
            </h3>
            <p className="text-xs text-slate-400 mb-4">Update fulfillment workflow and assign tracking.</p>

            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Fulfillment Status</label>
                <select
                  value={newFulfillmentStatus}
                  onChange={(e) => setNewFulfillmentStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Courier Tracking ID</label>
                <input
                  type="text"
                  placeholder="e.g. TRK-DEL-894819"
                  value={newTrackingNumber}
                  onChange={(e) => setNewTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                </input>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOrderStatus}
                disabled={updatingOrder}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl"
              >
                {updatingOrder ? 'Saving...' : 'Save Updates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-bold text-white text-base mb-1">Edit Product: {editingProduct.name}</h3>
            <p className="text-xs text-slate-400 mb-4">Update price and inventory in real-time.</p>

            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Price ({currencySymbol})</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={savingProduct}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl"
              >
                {savingProduct ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
