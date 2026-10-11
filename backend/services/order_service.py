import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.config import settings
from backend.models import Order, OrderItem, Cart, CartItem, Product, Coupon, Payment, User
from backend.schemas import CheckoutRequest
from backend.services.cart_service import CartService

class OrderService:
    VALID_FULFILLMENT_TRANSITIONS = {
        "pending": ["confirmed", "cancelled"],
        "confirmed": ["processing", "cancelled"],
        "processing": ["shipped", "cancelled"],
        "shipped": ["delivered", "cancelled"],
        "delivered": ["refunded"],
        "cancelled": [],
        "refunded": []
    }

    @staticmethod
    def generate_order_number() -> str:
        date_str = datetime.utcnow().strftime("%Y%m%d")
        rand_str = uuid.uuid4().hex[:6].upper()
        return f"ORD-{date_str}-{rand_str}"

    @staticmethod
    def create_order_from_cart(
        db: Session,
        cart: Cart,
        checkout_data: CheckoutRequest,
        user: Optional[User] = None
    ) -> Order:
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
        if not cart_items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

        # 1. Verify stock and calculate subtotal
        subtotal = 0.0
        order_items_to_create = []

        for item in cart_items:
            product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
            if not product or not product.is_active:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product #{item.product_id} is no longer available")

            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{product.name}'. Available: {product.stock_quantity}, requested: {item.quantity}"
                )

            unit_price = product.sale_price if product.sale_price else product.price
            item_total = round(unit_price * item.quantity, 2)
            subtotal += item_total

            # Deduct stock
            product.stock_quantity -= item.quantity

            order_items_to_create.append({
                "product_id": product.id,
                "product_name": product.name,
                "unit_price": unit_price,
                "quantity": item.quantity,
                "total_price": item_total
            })

        subtotal = round(subtotal, 2)

        # 2. Coupon discount
        discount_amount = 0.0
        applied_coupon = None
        if checkout_data.coupon_code:
            coupon, discount, msg = CartService.validate_coupon(db, checkout_data.coupon_code, subtotal)
            if coupon:
                discount_amount = discount
                applied_coupon = coupon
                coupon.times_used += 1

        # 3. Shipping fee
        shipping_fee = 0.0
        if subtotal < settings.FREE_SHIPPING_THRESHOLD:
            shipping_fee = settings.SHIPPING_FLAT_RATE

        # 4. Tax
        tax_amount = round((subtotal - discount_amount) * settings.TAX_RATE, 2)
        total_amount = round(max(0.0, subtotal - discount_amount + shipping_fee + tax_amount), 2)

        # 5. Create Order
        order_number = OrderService.generate_order_number()
        order = Order(
            order_number=order_number,
            user_id=user.id if user else None,
            product_id=order_items_to_create[0]["product_id"],
            product_name=order_items_to_create[0]["product_name"],
            price=total_amount,
            ordered_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            customer_name=checkout_data.customer_name,
            customer_email=checkout_data.customer_email,
            customer_phone=checkout_data.customer_phone,
            shipping_address=checkout_data.shipping_address,
            payment_method=checkout_data.payment_method,
            payment_status="paid" if checkout_data.payment_method in ["sandbox", "sandbox_card", "test_card"] else "pending",
            fulfillment_status="confirmed",
            subtotal=subtotal,
            discount_amount=discount_amount,
            shipping_fee=shipping_fee,
            tax_amount=tax_amount,
            total_amount=total_amount,
            coupon_code=applied_coupon.code if applied_coupon else None,
            notes=checkout_data.notes,
            created_at=datetime.utcnow()
        )
        db.add(order)
        db.flush()  # assign order.id


        # 6. Create Order Items
        for item_data in order_items_to_create:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item_data["product_id"],
                product_name=item_data["product_name"],
                unit_price=item_data["unit_price"],
                quantity=item_data["quantity"],
                total_price=item_data["total_price"]
            )
            db.add(order_item)

        # 7. Record payment if sandbox
        if checkout_data.payment_method in ["sandbox", "sandbox_card", "test_card"]:
            payment = Payment(
                order_id=order.id,
                provider="sandbox",
                transaction_id=f"TEST-TXN-{uuid.uuid4().hex[:10].upper()}",
                status="success",
                amount=total_amount,
                currency=settings.STORE_CURRENCY
            )
            db.add(payment)

        # 8. Clear cart
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def get_order_by_number(db: Session, order_number: str) -> Optional[Order]:
        return db.query(Order).filter(Order.order_number == order_number.strip()).first()

    @staticmethod
    def get_user_orders(db: Session, user_id: int) -> List[Order]:
        return db.query(Order).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).all()

    @staticmethod
    def update_order_status(
        db: Session,
        order_id: int,
        fulfillment_status: Optional[str] = None,
        payment_status: Optional[str] = None,
        tracking_number: Optional[str] = None
    ) -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        if fulfillment_status and fulfillment_status != order.fulfillment_status:
            current_status = order.fulfillment_status or "pending"
            valid_targets = OrderService.VALID_FULFILLMENT_TRANSITIONS.get(current_status, [])
            if fulfillment_status not in valid_targets:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot transition order fulfillment status from '{current_status}' to '{fulfillment_status}'"
                )

            # If cancelling order, restore inventory!
            if fulfillment_status == "cancelled" and current_status != "cancelled":
                for item in order.items:
                    product = db.query(Product).filter(Product.id == item.product_id).first()
                    if product:
                        product.stock_quantity += item.quantity

            order.fulfillment_status = fulfillment_status

        if payment_status:
            order.payment_status = payment_status

        if tracking_number is not None:
            order.tracking_number = tracking_number.strip()

        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)
        return order
