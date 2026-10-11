# ShopScape AI — Enterprise AI E-Commerce Shopping Platform

A full-stack, enterprise-grade AI-powered e-commerce business platform engineered for high-trust organic and wellness commerce. Featuring a responsive modern storefront, multimodal visual discovery, a catalog-grounded AI shopping concierge, live inventory & order management, customer accounts, and a secured business administration portal.

---

## 🌟 Architecture & Core Capabilities

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER STOREFRONT                             │
│       React 19 + TypeScript + Vite + Tailwind/Glass Design Tokens     │
│   (Catalog Filter, Search, Cart Drawer, Explicit Checkout, Tracking)   │
└───────────────────▲────────────────────────────────┬───────────────────┘
                    │                                │
                    │ HTTPS API / REST               │ WebSocket / SSE
                    │                                │
┌───────────────────┴────────────────────────────────▼───────────────────┐
│                        FASTAPI BACKEND SERVICE                         │
│  - JWT Auth & Security Boundary (Customer vs Admin)                    │
│  - Catalog & Search Engine (Category, Rating, Price, Organic)          │
│  - Cart & Promotion Engine (Dynamic Coupons, Tax, Free Shipping Tier)  │
│  - Transactional Order & Inventory Service (Concurrency Protected)    │
│  - Payment Gateway Abstraction (Sandbox Test Adapter, Razorpay, Stripe)│
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │                                │
┌───────────────────┴─────────────┐    ┌─────────────┴───────────────────┐
│     AI AGENT ORCHESTRATION      │    │      DATABASE & REPOSITORIES    │
│  - Catalog Tool Grounding       │    │  - SQLite (store.db) Migrated   │
│  - Multimodal Vision Analysis   │    │  - PostgreSQL Ready             │
│  - Purchase Safeguard Firewall  │    │  - SQLAlchemy 2.0 ORM           │
│  - Gemini & Groq LLM Adapters   │    │  - 32 Products & 102 Reviews    │
└─────────────────────────────────┘    └─────────────────────────────────┘
```

### 1. Customer Storefront
- **Visual Design**: Sleek dark slate aesthetic, emerald and teal accents, glassmorphic header, micro-animations, and responsive layouts across desktop, tablet, and mobile.
- **Dynamic Catalog**: Full-text keyword search, category filter pills, price range constraints, 100% organic certification filter, minimum star rating selector, and multiple sort options.
- **Product Detail Views**: High-resolution photography, price match guarantee badges, nutritional descriptions, verified customer reviews list, stock availability, and quantity controls.
- **Cart & Promotions**: Persistent session-based and customer carts, instant coupon validation (`WELCOME10`, `ORGANIC20`, `FREESHIP`), free shipping threshold progress bar (`₹999`), and GST calculation.
- **Order Tracking**: Real-time fulfillment progress tracker (Pending → Confirmed → Processing → Shipped → Delivered), courier tracking IDs, and comprehensive itemized breakdown.

### 2. Integrated AI Shopping Agent (The Core Concierge)
- **Catalog Grounding**: Directly invokes server-side catalog query tools to inspect real-time prices, stock availability, and verified customer reviews. Never fabricates products or inventory.
- **Structured Recommendation Cards**: Returns structured product cards with high-res thumbnails, prices, star ratings, and one-click "View Details" and "Add to Cart" triggers.
- **Multimodal Visual Product Search**: Customers can upload images to analyze visible product characteristics (category, color, organic attributes) and find matching items in the catalog.
- **CRITICAL PURCHASE RULE**: The AI agent prepares shopping carts and explains cost breakdowns, but **strictly never commits paid orders or charges directly via chat**. Final payment authorization requires explicit customer review and confirmation on the checkout screen.

### 3. Business Administration Center
- **Executive KPIs**: Real-time tracking of Total Revenue, Total Orders, Average Order Value (AOV), Registered Users, and Low-Stock Alerts.
- **Order Fulfillment Workflows**: Filter orders by status, inspect customer shipping details, update status transitions (Processing, Shipped, Delivered, Cancelled), and assign courier tracking numbers.
- **Inventory Management**: Search catalog, inspect real stock quantities, update prices, and replenish stock levels.
- **Promotions Engine**: Create percentage and flat-rate coupon codes with minimum cart value rules.

---

## 🔐 Security & Architecture Safeguards

1. **Role-Based Authorization (RBAC)**: All administrative endpoints (`/api/admin/*`) enforce cryptographic JWT claims with bcrypt password verification. Standard users receive HTTP `403 Forbidden`.
2. **Transaction-Safe Order Creation**: Stock is validated and deducted within database transaction locks to prevent race conditions or overselling.
3. **Restock on Cancellation**: Canceling an order automatically restores inventory levels within the same transaction.
4. **Idempotency & Clean Errors**: Server-side validation shields against duplicate checkouts, negative quantities, or invalid state jumps.
5. **Clear Development Sandbox**: Simulated test card payments display an explicit development test badge—never presenting test mocks as real payments.

---

## 🚀 Quick Setup & Local Execution

### Prerequisites
- Python 3.10+ (Recommended: Python 3.11 - 3.13)
- Node.js 18+ (Node v24 and npm 11 verified)

### 1. Environment Setup
```powershell
# Copy the environment template
copy .env.example .env
```
Ensure your API keys (e.g. `GEMINI_API_KEY` or `GROQ_API_KEY`) are present in `.env`.

### 2. Install Dependencies & Build Frontend
```powershell
# Activate Python Virtual Environment
.\.venv\Scripts\Activate.ps1

# Install backend dependencies (if needed)
pip install -r requirements.txt

# Build the production React SPA bundle
npm --prefix frontend run build
```

### 3. Run the Unified Application Server
```powershell
# Start FastAPI backend (serves API, static resources, and the built React SPA)
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

*(Optional)* For frontend hot-module-reloading development:
```powershell
npm --prefix frontend run dev
```
(Vite runs on `http://localhost:5173` and automatically proxies `/api` and `/resources` to the backend).

---

## 🔑 Demo Accounts & Pre-Seeded Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Store Administrator** | `admin@shopease.ai` | `AdminPass123!` | Full Admin Panel, Inventory, Orders, Promotions |
| **Demo Customer** | `alex@example.com` | `CustomerPass123!` | Storefront, Cart, Checkout, Order Tracking |

---

## 🧪 Automated Testing

The project includes automated integration tests covering the complete commerce and security lifecycle:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_backend.py -v
```

### Test Coverage (100% Passed):
- `test_health_and_config`: Health checks, store currency, flat-rate shipping settings.
- `test_products_list_and_categories`: Catalog queries, category aggregation, pagination.
- `test_product_detail_and_reviews`: Verified reviews extraction, 4.5★ average calculations.
- `test_cart_operations`: Session-based cart creation, item additions, quantity updates, coupon discounts, line item removal.
- `test_auth_and_security_boundary`: JWT generation, customer login, unauthorized 403 blocks on admin routes, admin 200 authorization.
- `test_checkout_and_status_transition`: Order number generation (`ORD-YYYYMMDD-XXXX`), sandbox payment verification, admin fulfillment progression (`processing` → `shipped` with tracking ID).
- `test_order_tracking_public`: Unauthenticated tracking by unique order reference.
- `test_review_submission`: Submitting verified customer reviews.
- `test_admin_product_update`: Live price and stock updates by authorized administrator.

---

## 💳 Payment Gateway Configurations

### 1. Development Sandbox Mode (Default)
`PAYMENT_PROVIDER="sandbox"` in `.env`. Instant verification for rapid local testing without external credentials.

### 2. Razorpay (India Focus)
1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Generate API Keys in Test Mode.
3. Configure `.env`:
   ```env
   PAYMENT_PROVIDER="razorpay"
   RAZORPAY_KEY_ID="rzp_test_..."
   RAZORPAY_KEY_SECRET="your_razorpay_secret"
   ```

### 3. Stripe (Global Commerce)
1. Sign up at [Stripe Dashboard](https://dashboard.stripe.com).
2. Configure `.env`:
   ```env
   PAYMENT_PROVIDER="stripe"
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

---

## 📁 Repository Structure

```
shopping agent/
├── backend/
│   ├── routes/
│   │   ├── admin.py             # Admin analytics, order status, catalog editor
│   │   ├── agent.py             # Grounded AI shopping agent chat & tool execution
│   │   ├── auth.py              # Customer & admin JWT registration/login
│   │   ├── cart.py              # Cart management & coupon discount engine
│   │   ├── orders.py            # Checkout & order tracking endpoints
│   │   ├── products.py          # Catalog querying, categories & visual search
│   │   └── reviews.py           # Verified customer reviews
│   ├── services/
│   │   ├── agent_service.py     # AI agent intent extraction, tools, vision analyzer
│   │   ├── cart_service.py      # Cart calculations, tax, coupon rules
│   │   ├── catalog_service.py   # Catalog query engine with filters & sorting
│   │   ├── order_service.py     # Transactional checkout & stock concurrency
│   │   └── payment_service.py   # Payment adapter abstraction (Sandbox, Razorpay, Stripe)
│   ├── config.py                # Environment & store configuration
│   ├── database.py              # SQLAlchemy engine (SQLite / PostgreSQL)
│   ├── main.py                  # FastAPI application entrypoint & SPA mounting
│   ├── models.py                # Relational DB models
│   ├── schemas.py               # Pydantic v2 schemas
│   ├── security.py              # Bcrypt password hashing & JWT handlers
│   └── seed.py                  # Non-destructive database migration & seed script
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.tsx      # Metrics, stock management & fulfillment
│   │   │   ├── AIAssistantDrawer.tsx   # Grounded conversational shopping assistant
│   │   │   ├── AuthModal.tsx           # Customer & Admin login/register
│   │   │   ├── CartDrawer.tsx          # Cart items, coupon entry & free shipping bar
│   │   │   ├── CheckoutModal.tsx       # Explicit confirmation checkout form
│   │   │   ├── Footer.tsx              # Store policies & brand footer
│   │   │   ├── Hero.tsx                # Hero section with trust pillars
│   │   │   ├── Navbar.tsx              # Search bar, category pills & AI trigger
│   │   │   ├── OrderTrackingView.tsx   # Real-time order progression tracker
│   │   │   ├── PolicyModal.tsx         # Shipping, returns & privacy guarantees
│   │   │   ├── ProductCard.tsx         # Rich product card with badges & quick actions
│   │   │   ├── ProductModal.tsx        # Product details & verified reviews list
│   │   │   └── VisualSearchModal.tsx   # Multimodal image upload & discovery
│   │   ├── api.ts               # Frontend API client
│   │   ├── App.tsx              # Root application router & view coordinator
│   │   ├── index.css            # Design system, glass panels, dark slate theme
│   │   ├── types.ts             # TypeScript domain interfaces
│   │   └── utils.ts             # Price formatting, image fallbacks, date helpers
│   ├── package.json             # React, Vite, Lucide dependencies
│   └── vite.config.ts           # Proxy to backend API
├── tests/
│   └── test_backend.py          # Pytest integration test suite (9 test cases)
├── resources/                   # High-res product images
├── store.db                     # Preserved SQLite database (32 products, 102 reviews)
├── .env.example                 # Config template
└── README.md                    # Complete architectural & operational guide
```
