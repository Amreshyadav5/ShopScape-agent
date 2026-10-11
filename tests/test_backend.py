import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_and_config():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "currency" in data

    config_res = client.get("/api/config")
    assert config_res.status_code == 200
    cfg = config_res.json()
    assert "store_name" in cfg
    assert "shipping_flat_rate" in cfg

def test_products_list_and_categories():
    res = client.get("/api/products")
    assert res.status_code == 200
    data = res.json()
    assert "products" in data
    assert len(data["products"]) > 0

    cats_res = client.get("/api/products/categories")
    assert cats_res.status_code == 200
    assert len(cats_res.json()) > 0

def test_product_detail_and_reviews():
    # Product #1 is Organic Raw Honey
    res = client.get("/api/products/1")
    assert res.status_code == 200
    prod = res.json()
    assert prod["id"] == 1
    assert "reviews" in prod
    assert prod["average_rating"] > 4.0

def test_cart_operations():
    # 1. Add item to cart with session header
    headers = {"X-Session-ID": "test-session-123"}
    add_res = client.post("/api/cart/items", json={"product_id": 1, "quantity": 2}, headers=headers)
    assert add_res.status_code == 200
    cart = add_res.json()
    assert len(cart["items"]) == 1
    assert cart["items"][0]["quantity"] == 2
    item_id = cart["items"][0]["id"]

    # 2. Update quantity
    upd_res = client.put(f"/api/cart/items/{item_id}", json={"quantity": 3}, headers=headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["items"][0]["quantity"] == 3

    # 3. Apply valid coupon
    coupon_res = client.post("/api/cart/coupon", json={"code": "WELCOME10"}, headers=headers)
    assert coupon_res.status_code == 200
    assert coupon_res.json()["discount_amount"] > 0

    # 4. Remove item
    del_res = client.delete(f"/api/cart/items/{item_id}", headers=headers)
    assert del_res.status_code == 200
    assert len(del_res.json()["items"]) == 0

def test_auth_and_security_boundary():
    # Ordinary user login
    login_res = client.post("/api/auth/login", json={"email": "alex@example.com", "password": "Customer123!"})
    assert login_res.status_code == 200
    cust_token = login_res.json()["access_token"]

    # Ordinary user attempts admin endpoint -> must return 403
    admin_attempt = client.get("/api/admin/metrics", headers={"Authorization": f"Bearer {cust_token}"})
    assert admin_attempt.status_code == 403

    # Admin login
    admin_login = client.post("/api/auth/login", json={"email": "admin@shopease.ai", "password": "AdminPass123!"})
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    # Admin accesses metrics -> must succeed
    metrics_res = client.get("/api/admin/metrics", headers={"Authorization": f"Bearer {admin_token}"})
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert "total_sales" in metrics
    assert "total_orders" in metrics

def test_checkout_and_status_transition():
    headers = {"X-Session-ID": "checkout-test-session"}
    # Add product
    client.post("/api/cart/items", json={"product_id": 2, "quantity": 1}, headers=headers)

    # Checkout
    order_res = client.post("/api/orders/checkout", json={
        "customer_name": "Test Shopper",
        "customer_email": "shopper@test.com",
        "customer_phone": "9876543210",
        "shipping_address": "42 Market Street, Bangalore, KA",
        "payment_method": "sandbox"
    }, headers=headers)
    assert order_res.status_code == 200
    order = order_res.json()
    assert order["order_number"].startswith("ORD-")
    assert order["payment_status"] == "paid"
    order_id = order["id"]

    # Admin login for status update
    admin_login = client.post("/api/auth/login", json={"email": "admin@shopease.ai", "password": "AdminPass123!"})
    admin_token = admin_login.json()["access_token"]

    # Update status: confirmed -> processing -> shipped
    upd1 = client.put(f"/api/admin/orders/{order_id}/status", json={"fulfillment_status": "processing"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert upd1.status_code == 200
    assert upd1.json()["fulfillment_status"] == "processing"

    upd2 = client.put(f"/api/admin/orders/{order_id}/status", json={"fulfillment_status": "shipped", "tracking_number": "TRK-998877"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert upd2.status_code == 200
    assert upd2.json()["tracking_number"] == "TRK-998877"

def test_order_tracking_public():
    # 1. Create order
    headers = {"X-Session-ID": "tracking-session-99"}
    client.post("/api/cart/items", json={"product_id": 1, "quantity": 1}, headers=headers)
    order_res = client.post("/api/orders/checkout", json={
        "customer_name": "Ravi Kumar",
        "customer_email": "ravi@example.com",
        "customer_phone": "9811223344",
        "shipping_address": "12 Residency Road, Bangalore",
        "payment_method": "sandbox"
    }, headers=headers)
    order_num = order_res.json()["order_number"]

    # 2. Public track endpoint by order number
    track_res = client.get(f"/api/orders/{order_num}")
    assert track_res.status_code == 200
    data = track_res.json()
    assert data["order_number"] == order_num
    assert data["customer_name"] == "Ravi Kumar"
    assert len(data["items"]) >= 1

def test_review_submission():
    review_res = client.post("/api/reviews/products/1", json={
        "reviewer_name": "Anita Desai",
        "rating": 5,
        "review_text": "Remarkable raw organic honey! Rich taste and thick consistency."
    })
    assert review_res.status_code == 200
    rev = review_res.json()
    assert rev["reviewer_name"] == "Anita Desai"
    assert rev["rating"] == 5

def test_admin_product_update():
    # Admin login
    admin_login = client.post("/api/auth/login", json={"email": "admin@shopease.ai", "password": "AdminPass123!"})
    admin_token = admin_login.json()["access_token"]

    # Update product #3 price & stock
    update_res = client.put("/api/admin/products/3", json={
        "price": 850.0,
        "stock_quantity": 42
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert update_res.status_code == 200
    prod = update_res.json()
    assert prod["price"] == 850.0
    assert prod["stock_quantity"] == 42

