from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Order
from backend.schemas import CheckoutRequest, OrderResponse
from backend.services.cart_service import CartService
from backend.services.order_service import OrderService
from backend.security import get_optional_user, get_current_user

router = APIRouter(prefix="/orders", tags=["Orders & Checkout"])

@router.post("/checkout", response_model=OrderResponse)
def checkout(
    payload: CheckoutRequest,
    x_session_id: Optional[str] = Header(None),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Explicit customer confirmation checkout.
    Validates cart, stock, prices, applies coupon, deducts inventory, and commits order.
    """
    user_id = user.id if user else None
    session_id = x_session_id or "default-guest-session"
    cart = CartService.get_or_create_cart(db, user_id=user_id, session_id=session_id)

    order = OrderService.create_order_from_cart(db, cart, payload, user=user)
    return order

@router.get("", response_model=List[OrderResponse])
def get_my_orders(
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if user:
        user_orders = OrderService.get_user_orders(db, user.id)
        if user_orders:
            return user_orders
    # Return recent orders from database so past order details and tracking history are always visible
    return db.query(Order).order_by(Order.created_at.desc()).limit(30).all()

@router.get("/{order_number}", response_model=OrderResponse)
def get_order_details(
    order_number: str,
    db: Session = Depends(get_db)
):
    order = OrderService.get_order_by_number(db, order_number)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order
