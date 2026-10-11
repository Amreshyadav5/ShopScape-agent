from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status


from backend.config import settings
from backend.models import Cart, CartItem, Product, Coupon

class CartService:
    @staticmethod
    def get_or_create_cart(db: Session, user_id: Optional[int] = None, session_id: Optional[str] = None) -> Cart:
        cart = None
        if user_id:
            cart = db.query(Cart).filter(Cart.user_id == user_id).first()
        elif session_id:
            cart = db.query(Cart).filter(Cart.session_id == session_id).first()

        if not cart:
            cart = Cart(user_id=user_id, session_id=session_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart

    @staticmethod
    def add_item_to_cart(db: Session, cart: Cart, product_id: int, quantity: int = 1) -> CartItem:
        product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        if product.stock_quantity < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {product.stock_quantity} units available in stock"
            )

        existing_item = db.query(CartItem).filter(
            CartItem.cart_id == cart.id,
            CartItem.product_id == product_id
        ).first()

        if existing_item:
            new_qty = existing_item.quantity + quantity
            if product.stock_quantity < new_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot add more than {product.stock_quantity} units"
                )
            existing_item.quantity = new_qty
            db.commit()
            db.refresh(existing_item)
            return existing_item
        else:
            new_item = CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity)
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            return new_item

    @staticmethod
    def update_item_quantity(db: Session, cart_id: int, item_id: int, quantity: int) -> Optional[CartItem]:
        item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

        if quantity <= 0:
            db.delete(item)
            db.commit()
            return None

        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product and product.stock_quantity < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {product.stock_quantity} units available"
            )

        item.quantity = quantity
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def remove_item(db: Session, cart_id: int, item_id: int) -> bool:
        item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart_id).first()
        if not item:
            return False
        db.delete(item)
        db.commit()
        return True

    @staticmethod
    def validate_coupon(db: Session, code: str, subtotal: float) -> Tuple[Optional[Coupon], float, str]:
        if not code or not code.strip():
            return None, 0.0, ""
        coupon = db.query(Coupon).filter(
            Coupon.code == code.strip().upper(),
            Coupon.is_active == True
        ).first()

        if not coupon:
            return None, 0.0, "Invalid or expired coupon code"

        if subtotal < coupon.min_order_value:
            return None, 0.0, f"Minimum cart amount of {settings.STORE_CURRENCY_SYMBOL}{coupon.min_order_value} required for this coupon"

        if coupon.usage_limit and coupon.times_used >= coupon.usage_limit:
            return None, 0.0, "Coupon usage limit reached"

        discount = 0.0
        if coupon.discount_type == "percentage":
            discount = round((subtotal * coupon.discount_value) / 100.0, 2)
            if coupon.max_discount:
                discount = min(discount, coupon.max_discount)
        elif coupon.discount_type == "fixed":
            discount = min(coupon.discount_value, subtotal)

        return coupon, discount, "Coupon applied successfully"

    @staticmethod
    def calculate_cart_details(db: Session, cart: Cart, coupon_code: Optional[str] = None) -> Dict[str, Any]:
        items_data = []
        subtotal = 0.0

        items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
        for item in items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                continue
            unit_price = product.sale_price if product.sale_price else product.price
            total_price = round(unit_price * item.quantity, 2)
            subtotal += total_price

            items_data.append({
                "id": item.id,
                "product_id": product.id,
                "product_name": product.name,
                "product_image": product.image_url,
                "unit_price": unit_price,
                "quantity": item.quantity,
                "total_price": total_price,
                "stock_available": product.stock_quantity
            })

        subtotal = round(subtotal, 2)
        discount_amount = 0.0
        applied_code = None

        if coupon_code and subtotal > 0:
            coupon, discount, _ = CartService.validate_coupon(db, coupon_code, subtotal)
            if coupon:
                discount_amount = discount
                applied_code = coupon.code

        # Shipping logic
        shipping_fee = 0.0
        if subtotal > 0 and subtotal < settings.FREE_SHIPPING_THRESHOLD:
            shipping_fee = settings.SHIPPING_FLAT_RATE

        # Tax logic
        tax_amount = round((subtotal - discount_amount) * settings.TAX_RATE, 2)
        total_amount = round(max(0.0, subtotal - discount_amount + shipping_fee + tax_amount), 2)

        return {
            "id": cart.id,
            "items": items_data,
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "shipping_fee": shipping_fee,
            "tax_amount": tax_amount,
            "total_amount": total_amount,
            "coupon_code": applied_code
        }
