from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.database import get_db
from backend.models import User, Product, Order, OrderItem, Coupon, Review
from backend.schemas import (
    AdminMetricsResponse, ProductCreate, ProductUpdate, ProductResponse,
    OrderResponse, OrderStatusUpdate, CouponResponse
)
from backend.security import get_current_admin
from backend.services.order_service import OrderService

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

@router.get("/metrics", response_model=AdminMetricsResponse)
def get_dashboard_metrics(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Total Sales (from paid or confirmed orders)
    sales_query = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
        Order.fulfillment_status != "cancelled"
    ).scalar()
    total_sales = float(sales_query or 0.0)

    # Total Orders
    total_orders = db.query(Order).count()

    # Average Order Value
    aov = round(total_sales / total_orders, 2) if total_orders > 0 else 0.0

    # Total Customers
    total_customers = db.query(User).filter(User.role == "customer").count()

    # Low stock products (< 15 units)
    low_stock = db.query(Product).filter(Product.stock_quantity < 15, Product.is_active == True).count()

    # Recent orders
    recent_orders = db.query(Order).order_by(desc(Order.created_at)).limit(10).all()

    # Sales by category
    cat_sales = (
        db.query(Product.category, func.coalesce(func.sum(OrderItem.total_price), 0.0))
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.fulfillment_status != "cancelled")
        .group_by(Product.category)
        .all()
    )
    sales_by_cat = {c[0]: float(c[1]) for c in cat_sales if c[0]}

    return {
        "total_sales": total_sales,
        "total_orders": total_orders,
        "average_order_value": aov,
        "total_customers": total_customers,
        "low_stock_products": low_stock,
        "recent_orders": recent_orders,
        "sales_by_category": sales_by_cat
    }

@router.get("/products", response_model=List[ProductResponse])
def get_admin_products(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Subquery for ratings
    rating_subq = (
        db.query(
            Review.product_id,
            func.round(func.avg(Review.rating), 2).label("avg_rating"),
            func.count(Review.id).label("rev_count")
        )
        .group_by(Review.product_id)
        .subquery()
    )

    rows = (
        db.query(
            Product,
            func.coalesce(rating_subq.c.avg_rating, 0.0).label("avg_rating"),
            func.coalesce(rating_subq.c.rev_count, 0).label("rev_count")
        )
        .outerjoin(rating_subq, Product.id == rating_subq.c.product_id)
        .order_by(Product.id.desc())
        .all()
    )

    result = []
    for p, avg, count in rows:
        result.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "category": p.category,
            "price": p.price,
            "sale_price": p.sale_price,
            "description": p.description,
            "short_description": p.short_description,
            "is_organic": bool(p.is_organic),
            "stock_quantity": p.stock_quantity,
            "sku": p.sku,
            "is_featured": p.is_featured,
            "is_active": p.is_active,
            "image_url": p.image_url,
            "average_rating": float(avg or 0.0),
            "review_count": int(count or 0),
            "created_at": p.created_at
        })
    return result

@router.post("/products", response_model=ProductResponse)
def create_product(
    payload: ProductCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    prod = Product(
        name=payload.name.strip(),
        category=payload.category.lower().strip() if payload.category else "general",
        price=payload.price,
        sale_price=payload.sale_price,
        description=payload.description,
        short_description=payload.short_description,
        is_organic=1 if payload.is_organic else 0,
        stock_quantity=payload.stock_quantity,
        sku=payload.sku,
        is_featured=payload.is_featured,
        image_url=payload.image_url
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return {
        "id": prod.id,
        "name": prod.name,
        "slug": prod.slug,
        "category": prod.category,
        "price": prod.price,
        "sale_price": prod.sale_price,
        "description": prod.description,
        "short_description": prod.short_description,
        "is_organic": bool(prod.is_organic),
        "stock_quantity": prod.stock_quantity,
        "sku": prod.sku,
        "is_featured": prod.is_featured,
        "is_active": prod.is_active,
        "image_url": prod.image_url,
        "average_rating": 0.0,
        "review_count": 0,
        "created_at": prod.created_at
    }

@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    for field, val in payload.dict(exclude_unset=True).items():
        if field == "is_organic":
            setattr(prod, field, 1 if val else 0)
        else:
            setattr(prod, field, val)

    db.commit()
    db.refresh(prod)
    return {
        "id": prod.id,
        "name": prod.name,
        "slug": prod.slug,
        "category": prod.category,
        "price": prod.price,
        "sale_price": prod.sale_price,
        "description": prod.description,
        "short_description": prod.short_description,
        "is_organic": bool(prod.is_organic),
        "stock_quantity": prod.stock_quantity,
        "sku": prod.sku,
        "is_featured": prod.is_featured,
        "is_active": prod.is_active,
        "image_url": prod.image_url,
        "average_rating": 0.0,
        "review_count": 0,
        "created_at": prod.created_at
    }

@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    prod.is_active = False  # Safe soft-delete
    db.commit()
    return {"message": f"Product #{product_id} archived successfully"}

@router.get("/orders", response_model=List[OrderResponse])
def get_admin_orders(
    status_filter: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Order)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(Order.fulfillment_status == status_filter.lower())
    return query.order_by(desc(Order.created_at)).all()

@router.put("/orders/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return OrderService.update_order_status(
        db=db,
        order_id=order_id,
        fulfillment_status=payload.fulfillment_status,
        payment_status=payload.payment_status,
        tracking_number=payload.tracking_number
    )

@router.get("/coupons")
def list_coupons(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(Coupon).all()

@router.post("/coupons")
def create_coupon(
    code: str,
    discount_type: str = "percentage",
    discount_value: float = 10.0,
    min_order_value: float = 0.0,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    coupon = Coupon(
        code=code.strip().upper(),
        discount_type=discount_type,
        discount_value=discount_value,
        min_order_value=min_order_value,
        is_active=True
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon
