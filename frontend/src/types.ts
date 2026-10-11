export interface Product {
  id: number;
  name: string;
  slug?: string;
  category?: string;
  price: number;
  sale_price?: number;
  description?: string;
  short_description?: string;
  is_organic: boolean;
  stock_quantity: number;
  sku?: string;
  is_featured: boolean;
  is_active: boolean;
  image_url?: string;
  average_rating: number;
  review_count: number;
  created_at?: string;
}

export interface Review {
  id: number;
  product_id: number;
  rating: number;
  reviewer_name: string;
  review_text?: string;
  created_at?: string;
  is_verified: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image?: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  stock_available: number;
}

export interface Cart {
  id: number;
  items: CartItem[];
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  tax_amount: number;
  total_amount: number;
  coupon_code?: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'customer' | 'admin';
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address: string;
  payment_method: string;
  payment_status: string;
  fulfillment_status: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  tax_amount: number;
  total_amount: number;
  coupon_code?: string;
  tracking_number?: string;
  created_at?: string;
  items: OrderItem[];
}

export interface AdminMetrics {
  total_sales: number;
  total_orders: number;
  average_order_value: number;
  total_customers: number;
  low_stock_products: number;
  recent_orders: Order[];
  sales_by_category: Record<string, number>;
}

export interface OrderProposal {
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
  is_organic: boolean;
  stock_available: number;
  estimated_delivery?: string;
  status: 'pending_confirmation' | 'confirmed' | 'cancelled';
}

export interface CartItemSummary {
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
}

export interface CartSummaryContext {
  items: CartItemSummary[];
  total_items: number;
  subtotal: number;
  shipping_fee: number;
  free_shipping_eligible: boolean;
  amount_needed_for_free_shipping: number;
}

export interface ComparisonItem {
  id: number;
  name: string;
  price: number;
  rating: number;
  review_count: number;
  category: string;
  is_organic: boolean;
  image_url?: string;
  features: string[];
}

export interface ProductComparison {
  item_a: ComparisonItem;
  item_b: ComparisonItem;
  verdict: string;
}

export interface AgentProductCard {
  id: number;
  name: string;
  price: number;
  rating: number;
  review_count?: number;
  is_organic: boolean;
  category?: string;
  image_url?: string;
  description?: string;
  stock_quantity?: number;
}

export interface AgentChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  recommended_products?: AgentProductCard[];
  order_proposal?: OrderProposal;
  cart_summary?: CartSummaryContext;
  comparison?: ProductComparison;
  navigate_to?: string;
  image_preview?: string;
  timestamp?: string;
}

export interface StoreConfig {
  store_name: string;
  currency: string;
  currency_symbol: string;
  shipping_flat_rate: number;
  free_shipping_threshold: number;
  tax_rate: number;
  payment_provider: string;
}
