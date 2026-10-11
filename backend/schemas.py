from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# ----------------- Auth Schemas -----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ----------------- Category Schemas -----------------
class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------- Review Schemas -----------------
class ReviewCreate(BaseModel):
    rating: float = Field(..., ge=1.0, le=5.0)
    reviewer_name: str
    review_text: str

class ReviewResponse(BaseModel):
    id: int
    product_id: int
    rating: float
    reviewer_name: str
    review_text: Optional[str] = None
    created_at: Optional[datetime] = None
    is_verified: bool = True

    class Config:
        from_attributes = True

# ----------------- Product Schemas -----------------
class ProductBase(BaseModel):
    name: str
    category: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    is_organic: bool = False
    stock_quantity: int = 50
    sku: Optional[str] = None
    is_featured: bool = False
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    description: Optional[str] = None
    is_organic: Optional[bool] = None
    stock_quantity: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    slug: Optional[str] = None
    is_active: bool = True
    average_rating: float = 0.0
    review_count: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProductDetailResponse(ProductResponse):
    reviews: List[ReviewResponse] = []

# ----------------- Cart Schemas -----------------
class CartItemAdd(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)

class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=0)

class CartItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_image: Optional[str] = None
    unit_price: float
    quantity: int
    total_price: float
    stock_available: int

class CartResponse(BaseModel):
    id: int
    items: List[CartItemResponse] = []
    subtotal: float
    discount_amount: float = 0.0
    shipping_fee: float = 0.0
    tax_amount: float = 0.0
    total_amount: float
    coupon_code: Optional[str] = None

# ----------------- Coupon Schemas -----------------
class CouponApply(BaseModel):
    code: str

class CouponResponse(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    min_order_value: float
    max_discount: Optional[float] = None
    is_active: bool

# ----------------- Order Schemas -----------------
class CheckoutRequest(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    shipping_address: str
    payment_method: str = "cod"  # "cod", "sandbox", "razorpay"
    coupon_code: Optional[str] = None
    notes: Optional[str] = None

class OrderItemResponse(BaseModel):
    product_id: int
    product_name: str
    unit_price: float
    quantity: int
    total_price: float

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    order_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    shipping_address: Optional[str] = None
    payment_method: Optional[str] = "cod"
    payment_status: Optional[str] = "pending"
    fulfillment_status: Optional[str] = "confirmed"
    subtotal: float = 0.0
    discount_amount: float = 0.0
    shipping_fee: float = 0.0
    tax_amount: float = 0.0
    total_amount: float = 0.0
    tracking_number: Optional[str] = None
    created_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    fulfillment_status: Optional[str] = None
    payment_status: Optional[str] = None
    tracking_number: Optional[str] = None

# ----------------- AI Agent Schemas -----------------
class AgentChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None

class AgentProductCard(BaseModel):
    id: int
    name: str
    price: float
    rating: float = 4.8
    review_count: Optional[int] = 4
    is_organic: bool = True
    category: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    stock_quantity: Optional[int] = 50

class OrderProposal(BaseModel):
    product_id: int
    product_name: str
    unit_price: float
    quantity: int
    subtotal: float
    image_url: Optional[str] = None
    is_organic: bool = True
    stock_available: int = 50
    estimated_delivery: str = "Tomorrow by 2 PM"
    status: str = "pending_confirmation"

class CartItemDetail(BaseModel):
    product_id: int
    product_name: str
    unit_price: float
    quantity: int
    subtotal: float
    image_url: Optional[str] = None

class CartSummaryContext(BaseModel):
    items: List[CartItemDetail] = []
    total_items: int = 0
    subtotal: float = 0.0
    shipping_fee: float = 0.0
    free_shipping_eligible: bool = False
    amount_needed_for_free_shipping: float = 0.0

class ComparisonItem(BaseModel):
    id: int
    name: str
    price: float
    rating: float = 4.8
    review_count: int = 4
    category: str = "organic-pantry"
    is_organic: bool = True
    image_url: Optional[str] = None
    features: List[str] = []

class ProductComparison(BaseModel):
    item_a: ComparisonItem
    item_b: ComparisonItem
    verdict: str

class AgentChatResponse(BaseModel):
    reply: str
    session_id: str
    recommended_products: List[AgentProductCard] = []
    actions_taken: List[str] = []
    cart_updated: bool = False
    order_proposal: Optional[OrderProposal] = None
    cart_summary: Optional[CartSummaryContext] = None
    comparison: Optional[ProductComparison] = None
    navigate_to: Optional[str] = None

# ----------------- Admin Analytics -----------------
class AdminMetricsResponse(BaseModel):
    total_sales: float
    total_orders: int
    average_order_value: float
    total_customers: int
    low_stock_products: int
    recent_orders: List[OrderResponse] = []
    sales_by_category: Dict[str, float] = {}
