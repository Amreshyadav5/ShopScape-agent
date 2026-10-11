import os
import tempfile
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.catalog_service import CatalogService
from backend.services.agent_service import AIAgentService
from backend.schemas import ProductResponse, ProductDetailResponse, CategoryResponse

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=dict)
def list_products(
    q: Optional[str] = Query(None, description="Search term"),
    category: Optional[str] = Query(None, description="Category filter"),
    department: Optional[str] = Query(None, description="Department filter"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    is_organic: Optional[bool] = Query(None, description="Organic filter"),
    min_rating: Optional[float] = Query(None, description="Minimum star rating"),
    sort_by: str = Query("relevance", description="Sort option"),
    is_featured: Optional[bool] = Query(None, description="Featured only"),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    products, total = CatalogService.get_products(
        db=db,
        query=q,
        category=category,
        department=department,
        min_price=min_price,
        max_price=max_price,
        is_organic=is_organic,
        min_rating=min_rating,
        sort_by=sort_by,
        is_featured=is_featured,
        limit=limit,
        offset=offset
    )
    return {
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return CatalogService.get_categories(db)

@router.get("/{product_id}", response_model=ProductDetailResponse)
def get_product_details(product_id: int, db: Session = Depends(get_db)):
    product = CatalogService.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product

@router.post("/{product_id}/reviews")
def add_product_review(product_id: int, payload: dict, db: Session = Depends(get_db)):
    from backend.models import Review, Product
    product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    raw_rating = payload.get("rating", 5)
    try:
        rating_val = min(5.0, max(1.0, float(raw_rating)))
    except (ValueError, TypeError):
        rating_val = 5.0

    review = Review(
        product_id=product_id,
        rating=rating_val,
        reviewer_name=payload.get("reviewer_name", "Verified Customer").strip() or "Verified Customer",
        review_text=payload.get("review_text", "").strip(),
        is_verified=True
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return {
        "id": review.id,
        "product_id": review.product_id,
        "rating": review.rating,
        "reviewer_name": review.reviewer_name,
        "review_text": review.review_text,
        "is_verified": review.is_verified,
        "created_at": review.created_at.isoformat() if review.created_at else None
    }


@router.post("/visual-search")
async def visual_search(
    file: Optional[UploadFile] = File(None),
    sample_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Multimodal visual search: Analyze product photo and query catalog.
    """
    image_bytes = None
    mime_type = "image/jpeg"

    if file and file.filename:
        image_bytes = await file.read()
        mime_type = file.content_type or "image/jpeg"
    elif sample_name:
        # Load from resources/
        res_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "resources")
        sample_path = os.path.join(res_dir, sample_name)
        if os.path.exists(sample_path):
            with open(sample_path, "rb") as f:
                image_bytes = f.read()
            mime_type = "image/png"
        else:
            raise HTTPException(status_code=400, detail="Sample image not found")
    else:
        raise HTTPException(status_code=400, detail="Please upload an image file or choose a sample")

    # Analyze via vision model
    analysis = AIAgentService.analyze_image_bytes(image_bytes, mime_type=mime_type)

    search_query = analysis.get("search_query") or analysis.get("product_type") or ""
    is_org = analysis.get("is_organic")

    # Query catalog
    matches, total = CatalogService.get_products(
        db,
        query=search_query,
        is_organic=is_org if isinstance(is_org, bool) else None,
        limit=12
    )

    # Fallback to broader category search if keyword was too specific
    if not matches and analysis.get("product_type"):
        matches, total = CatalogService.get_products(db, query=analysis.get("product_type"), limit=12)

    return {
        "analysis": analysis,
        "matched_products": matches,
        "total_found": len(matches)
    }
