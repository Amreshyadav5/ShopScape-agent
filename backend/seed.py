import os
import sqlite3
from backend.database import SessionLocal, engine, Base
from backend.models import User, Category, Product, Review, Coupon, Order, OrderItem
from backend.security import hash_password
from backend.config import settings
import setup_db

CATEGORY_IMAGES = {
    "honey": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80",
    "oil": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
    "nuts": "https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&w=600&q=80",
    "seeds": "https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=600&q=80",
    "grains": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
    "tea": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
    "coffee": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "snacks": "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
    "dairy-alt": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",
}

def migrate_existing_tables():
    """Perform non-destructive ALTER TABLE migrations on existing SQLite database."""
    import sqlite3
    db_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "store.db")
    if not os.path.exists(db_file):
        return

    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # Check products
    cursor.execute("PRAGMA table_info(products)")
    existing_cols = [row[1] for row in cursor.fetchall()]
    if existing_cols:
        needed_prod_cols = [
            ("slug", "TEXT"),
            ("sale_price", "REAL"),
            ("cost_price", "REAL"),
            ("short_description", "TEXT"),
            ("stock_quantity", "INTEGER DEFAULT 50"),
            ("sku", "TEXT"),
            ("is_featured", "INTEGER DEFAULT 0"),
            ("is_active", "INTEGER DEFAULT 1"),
            ("image_url", "TEXT"),
            ("created_at", "DATETIME"),
            ("updated_at", "DATETIME"),
        ]
        for col_name, col_type in needed_prod_cols:
            if col_name not in existing_cols:
                cursor.execute(f"ALTER TABLE products ADD COLUMN {col_name} {col_type}")

    # Check reviews
    cursor.execute("PRAGMA table_info(reviews)")
    rev_cols = [row[1] for row in cursor.fetchall()]
    if rev_cols:
        if "user_id" not in rev_cols:
            cursor.execute("ALTER TABLE reviews ADD COLUMN user_id INTEGER")
        if "created_at" not in rev_cols:
            cursor.execute("ALTER TABLE reviews ADD COLUMN created_at DATETIME")
        if "is_verified" not in rev_cols:
            cursor.execute("ALTER TABLE reviews ADD COLUMN is_verified INTEGER DEFAULT 1")

    # Check orders
    cursor.execute("PRAGMA table_info(orders)")
    ord_cols = [row[1] for row in cursor.fetchall()]
    if ord_cols:
        needed_ord_cols = [
            ("order_number", "TEXT"),
            ("user_id", "INTEGER"),
            ("customer_name", "TEXT"),
            ("customer_email", "TEXT"),
            ("customer_phone", "TEXT"),
            ("shipping_address", "TEXT"),
            ("payment_method", "TEXT DEFAULT 'cod'"),
            ("payment_status", "TEXT DEFAULT 'pending'"),
            ("fulfillment_status", "TEXT DEFAULT 'confirmed'"),
            ("subtotal", "REAL DEFAULT 0.0"),
            ("discount_amount", "REAL DEFAULT 0.0"),
            ("shipping_fee", "REAL DEFAULT 0.0"),
            ("tax_amount", "REAL DEFAULT 0.0"),
            ("total_amount", "REAL DEFAULT 0.0"),
            ("coupon_code", "TEXT"),
            ("tracking_number", "TEXT"),
            ("notes", "TEXT"),
            ("created_at", "DATETIME"),
            ("updated_at", "DATETIME"),
        ]
        for col_name, col_type in needed_ord_cols:
            if col_name not in ord_cols:
                cursor.execute(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type}")

    conn.commit()
    conn.close()

def migrate_and_seed():
    """Ensure database tables exist, legacy SQLite data is preserved, and admin accounts/coupons are seeded."""
    migrate_existing_tables()
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # 1. Seed or verify admin
        admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not admin_user:
            admin_user = User(
                email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                full_name="Store Administrator",
                role="admin"
            )
            db.add(admin_user)
            print(f"Created admin user: {settings.ADMIN_EMAIL}")

        # 2. Seed customer demo account
        demo_user = db.query(User).filter(User.email == "alex@example.com").first()
        if not demo_user:
            demo_user = User(
                email="alex@example.com",
                password_hash=hash_password("Customer123!"),
                full_name="Alex Johnson",
                role="customer"
            )
            db.add(demo_user)
            print("Created demo customer: alex@example.com")

        # 3. Seed coupons
        existing_coupons = db.query(Coupon).count()
        if existing_coupons == 0:
            coupons = [
                Coupon(code="WELCOME10", discount_type="percentage", discount_value=10.0, min_order_value=0.0, is_active=True),
                Coupon(code="ORGANIC20", discount_type="percentage", discount_value=20.0, min_order_value=25.0, max_discount=15.0, is_active=True),
                Coupon(code="FREESHIP", discount_type="fixed", discount_value=settings.SHIPPING_FLAT_RATE, min_order_value=20.0, is_active=True)
            ]
            db.add_all(coupons)
            print("Seeded promotion coupons.")

        # 4. Check if products exist in database; if empty, seed from setup_db
        prod_count = db.query(Product).count()
        if prod_count == 0:
            print("Seeding catalog from setup_db...")
            setup_db.create_database()

        # 5. Populate product image URLs and categories if missing
        prods = db.query(Product).all()
        for p in prods:
            cat_key = (p.category or "").lower()
            if not p.image_url:
                p.image_url = CATEGORY_IMAGES.get(cat_key, CATEGORY_IMAGES["honey"])
            if not p.stock_quantity or p.stock_quantity <= 0:
                p.stock_quantity = 35
            if not p.sku:
                p.sku = f"SKU-{p.id:04d}"

        # 6. Populate Category records
        cats = [
            ("Honey", "honey", "Pure, raw, and organic farm-fresh honeys.", CATEGORY_IMAGES["honey"]),
            ("Oils", "oil", "Cold-pressed extra virgin and healthy cooking oils.", CATEGORY_IMAGES["oil"]),
            ("Nuts & Seeds", "nuts", "Wholesome organic nuts and nutrient-rich seeds.", CATEGORY_IMAGES["nuts"]),
            ("Grains & Cereals", "grains", "Whole grains, quinoa, and rolled breakfast oats.", CATEGORY_IMAGES["grains"]),
            ("Tea & Coffee", "tea", "Artisanal teas and single-origin Arabica roasts.", CATEGORY_IMAGES["coffee"]),
            ("Healthy Snacks", "snacks", "Natural snacks, organic dried fruits, and trail mixes.", CATEGORY_IMAGES["snacks"]),
            ("Dairy Alternatives", "dairy-alt", "Plant-based milks and organic creamy alternatives.", CATEGORY_IMAGES["dairy-alt"]),
        ]
        for name, slug, desc, img in cats:
            existing_cat = db.query(Category).filter(Category.slug == slug).first()
            if not existing_cat:
                db.add(Category(name=name, slug=slug, description=desc, image_url=img))

        # 7. Backfill legacy orders

        legacy_orders = db.query(Order).all()
        for ord_obj in legacy_orders:
            if not ord_obj.order_number:
                ord_obj.order_number = f"ORD-LEGACY-{ord_obj.id}"
            if not ord_obj.customer_name:
                ord_obj.customer_name = "Walk-in Customer"
            if not ord_obj.customer_email:
                ord_obj.customer_email = "customer@shopscape.ai"
            if not ord_obj.shipping_address:
                ord_obj.shipping_address = "In-Store Pickup"
            if not ord_obj.total_amount:
                ord_obj.total_amount = ord_obj.price or 14.99
            if not ord_obj.subtotal:
                ord_obj.subtotal = ord_obj.price or 14.99
            if not ord_obj.fulfillment_status:
                ord_obj.fulfillment_status = "delivered"
            if not ord_obj.payment_status:
                ord_obj.payment_status = "paid"

        db.commit()
        print("Database migration and seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    migrate_and_seed()
