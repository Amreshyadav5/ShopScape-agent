from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Review, Product, User
from backend.schemas import ReviewCreate, ReviewResponse
from backend.security import get_optional_user

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.get("/products/{product_id}", response_model=List[ReviewResponse])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.product_id == product_id).order_by(Review.created_at.desc()).all()

@router.post("/products/{product_id}", response_model=ReviewResponse)
def create_review(
    product_id: int,
    payload: ReviewCreate,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    reviewer = user.full_name if user else payload.reviewer_name
    review = Review(
        product_id=product_id,
        user_id=user.id if user else None,
        rating=payload.rating,
        reviewer_name=reviewer,
        review_text=payload.review_text.strip(),
        is_verified=bool(user)
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
