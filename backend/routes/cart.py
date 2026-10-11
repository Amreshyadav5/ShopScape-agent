from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.schemas import CartItemAdd, CartItemUpdate, CartResponse, CouponApply
from backend.services.cart_service import CartService
from backend.security import get_optional_user

router = APIRouter(prefix="/cart", tags=["Shopping Cart"])

def get_cart_identifier(x_session_id: Optional[str] = Header(None), user: Optional[User] = Depends(get_optional_user)):
    user_id = user.id if user else None
    session_id = x_session_id or "default-guest-session"
    return user_id, session_id

@router.get("", response_model=CartResponse)
def get_cart(
    coupon_code: Optional[str] = None,
    ident=Depends(get_cart_identifier),
    db: Session = Depends(get_db)
):
    user_id, session_id = ident
    cart = CartService.get_or_create_cart(db, user_id=user_id, session_id=session_id)
    return CartService.calculate_cart_details(db, cart, coupon_code=coupon_code)

@router.post("/items", response_model=CartResponse)
def add_to_cart(
    payload: CartItemAdd,
    coupon_code: Optional[str] = None,
    ident=Depends(get_cart_identifier),
    db: Session = Depends(get_db)
):
    user_id, session_id = ident
    cart = CartService.get_or_create_cart(db, user_id=user_id, session_id=session_id)
    CartService.add_item_to_cart(db, cart, product_id=payload.product_id, quantity=payload.quantity)
    return CartService.calculate_cart_details(db, cart, coupon_code=coupon_code)

@router.put("/items/{item_id}", response_model=CartResponse)
def update_cart_item(
    item_id: int,
    payload: CartItemUpdate,
    coupon_code: Optional[str] = None,
    ident=Depends(get_cart_identifier),
    db: Session = Depends(get_db)
):
    user_id, session_id = ident
    cart = CartService.get_or_create_cart(db, user_id=user_id, session_id=session_id)
    CartService.update_item_quantity(db, cart.id, item_id, payload.quantity)
    return CartService.calculate_cart_details(db, cart, coupon_code=coupon_code)

@router.delete("/items/{item_id}", response_model=CartResponse)
def remove_cart_item(
    item_id: int,
    coupon_code: Optional[str] = None,
    ident=Depends(get_cart_identifier),
    db: Session = Depends(get_db)
):
    user_id, session_id = ident
    cart = CartService.get_or_create_cart(db, user_id=user_id, session_id=session_id)
    CartService.remove_item(db, cart.id, item_id)
    return CartService.calculate_cart_details(db, cart, coupon_code=coupon_code)

@router.post("/coupon")
def apply_coupon(
    payload: CouponApply,
    ident=Depends(get_cart_identifier),
    db: Session = Depends(get_db)
):
    user_id, session_id = ident
    cart = CartService.get_or_create_cart(db, user_id=user_id, session_id=session_id)
    details = CartService.calculate_cart_details(db, cart, coupon_code=payload.code)
    if not details["coupon_code"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid coupon code or minimum order requirements not met"
        )
    return details
