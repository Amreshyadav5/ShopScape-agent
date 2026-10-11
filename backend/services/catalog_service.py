from typing import List, Optional, Tuple, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, asc

from backend.models import Product, Review, Category, ProductImage
from backend.schemas import ProductResponse, ProductDetailResponse, ReviewResponse

class CatalogService:
    @staticmethod
    def get_products(
        db: Session,
        query: Optional[str] = None,
        category: Optional[str] = None,
        department: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        is_organic: Optional[bool] = None,
        min_rating: Optional[float] = None,
        sort_by: str = "relevance",  # relevance, price_asc, price_desc, rating_desc, newest
        is_featured: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Dict], int]:
        """Query products with rich filters and aggregated ratings."""
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

        base_query = db.query(
            Product,
            func.coalesce(rating_subq.c.avg_rating, 0.0).label("avg_rating"),
            func.coalesce(rating_subq.c.rev_count, 0).label("rev_count")
        ).outerjoin(rating_subq, Product.id == rating_subq.c.product_id).filter(Product.is_active == True)

        # Department filtering
        active_dept = (department or "").strip().lower()
        if active_dept and active_dept != "all":
            if active_dept in ["fresh-groceries", "fresh sabji & produce", "sabji", "fresh", "produce"]:
                base_query = base_query.filter(Product.category == "fresh-groceries")
            elif active_dept in ["clothing-shoes", "clothing & footwear", "clothing", "shoes", "fashion", "apparel"]:
                base_query = base_query.filter(Product.category == "clothing-shoes")
            elif active_dept in ["beverages-drinks", "beverages & drinks", "drinks", "beverages"]:
                base_query = base_query.filter(
                    or_(
                        Product.category == "beverages-drinks",
                        Product.category.in_(["tea", "coffee", "dairy-alt"])
                    )
                )
            elif active_dept in ["electronics", "electronics & gadgets", "gadgets"]:
                base_query = base_query.filter(Product.category == "electronics")
            elif active_dept in ["organic-pantry", "organic pantry", "pantry"]:
                base_query = base_query.filter(
                    Product.category.in_(["honey", "oil", "nuts", "seeds", "grains", "tea", "coffee", "snacks", "dairy-alt", "organic-pantry"])
                )

        # Category / Subcategory filtering
        if category and category.lower() != "all":
            cat_clean = category.strip().lower()
            if cat_clean in ["organic-pantry", "organic pantry", "pantry"]:
                base_query = base_query.filter(
                    Product.category.in_(["honey", "oil", "nuts", "seeds", "grains", "tea", "coffee", "snacks", "dairy-alt", "organic-pantry"])
                )
            elif cat_clean in ["fresh-groceries", "fresh sabji & produce", "produce"]:
                base_query = base_query.filter(Product.category == "fresh-groceries")
            elif cat_clean in ["clothing-shoes", "clothing & footwear", "apparel"]:
                base_query = base_query.filter(Product.category == "clothing-shoes")
            elif cat_clean in ["beverages-drinks", "beverages & drinks", "drinks", "beverages"]:
                base_query = base_query.filter(
                    or_(
                        Product.category == "beverages-drinks",
                        Product.category.in_(["tea", "coffee", "dairy-alt"])
                    )
                )
            elif cat_clean in ["electronics", "electronics & gadgets", "gadgets"]:
                base_query = base_query.filter(Product.category == "electronics")
            # Subcategory filters
            elif cat_clean in ["shoes", "sneakers", "footwear", "loafers", "boots", "slides"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%shoe%"),
                        Product.name.ilike("%sneaker%"),
                        Product.name.ilike("%loafer%"),
                        Product.name.ilike("%slip-on%"),
                        Product.name.ilike("%boot%"),
                        Product.name.ilike("%slide%")
                    )
                )
            elif cat_clean in ["shirts", "shirt", "polos", "flannels"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%shirt%"),
                        Product.name.ilike("%polo%"),
                        Product.name.ilike("%henley%")
                    ),
                    ~Product.name.ilike("%t-shirt%"),
                    ~Product.name.ilike("%undershirt%")
                )
            elif cat_clean in ["t-shirts", "tshirts", "t-shirt", "tees", "tops"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%t-shirt%"),
                        Product.name.ilike("%tee%"),
                        Product.name.ilike("%hoodie%"),
                        Product.name.ilike("%jacket%"),
                        Product.name.ilike("%v-neck%")
                    )
                )
            elif cat_clean in ["pants", "jeans", "trousers", "joggers", "shorts", "sweatpants"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%pant%"),
                        Product.name.ilike("%trouser%"),
                        Product.name.ilike("%chino%"),
                        Product.name.ilike("%jeans%"),
                        Product.name.ilike("%jogger%"),
                        Product.name.ilike("%short%"),
                        Product.name.ilike("%sweatpant%")
                    )
                )
            elif cat_clean in ["greens", "herbs", "greens & herbs", "leafy"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%spinach%"),
                        Product.name.ilike("%palak%"),
                        Product.name.ilike("%mint%"),
                        Product.name.ilike("%coriander%"),
                        Product.name.ilike("%herb%"),
                        Product.name.ilike("%methi%"),
                        Product.name.ilike("%kale%"),
                        Product.name.ilike("%lettuce%")
                    )
                )
            elif cat_clean in ["sabji", "vegetables", "veggies"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%tomato%"),
                        Product.name.ilike("%onion%"),
                        Product.name.ilike("%potato%"),
                        Product.name.ilike("%aloo%"),
                        Product.name.ilike("%pyaaz%"),
                        Product.name.ilike("%capsicum%"),
                        Product.name.ilike("%carrot%"),
                        Product.name.ilike("%broccoli%"),
                        Product.name.ilike("%peas%"),
                        Product.name.ilike("%matar%"),
                        Product.name.ilike("%cucumber%"),
                        Product.name.ilike("%ginger%"),
                        Product.name.ilike("%garlic%"),
                        Product.name.ilike("%okra%"),
                        Product.name.ilike("%bhindi%"),
                        Product.name.ilike("%eggplant%"),
                        Product.name.ilike("%baingan%"),
                        Product.name.ilike("%cauliflower%"),
                        Product.name.ilike("%gobi%")
                    )
                )
            elif cat_clean in ["fruits", "orchard"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%apple%"),
                        Product.name.ilike("%banana%"),
                        Product.name.ilike("%mango%"),
                        Product.name.ilike("%pomegranate%"),
                        Product.name.ilike("%orange%"),
                        Product.name.ilike("%grape%"),
                        Product.name.ilike("%papaya%")
                    )
                )
            elif cat_clean in ["juices", "juice", "coconut", "smoothies"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%juice%"),
                        Product.name.ilike("%coconut%"),
                        Product.name.ilike("%lemonade%"),
                        Product.name.ilike("%smoothie%"),
                        Product.name.ilike("%nectar%"),
                        Product.name.ilike("%cider%"),
                        Product.name.ilike("%aloe%")
                    )
                )
            elif cat_clean in ["coffee-tea", "coffee", "tea", "chai", "cold brew", "matcha"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%coffee%"),
                        Product.name.ilike("%tea%"),
                        Product.name.ilike("%cold brew%"),
                        Product.name.ilike("%matcha%"),
                        Product.name.ilike("%chai%"),
                        Product.name.ilike("%macchiato%"),
                        Product.name.ilike("%espresso%"),
                        Product.name.ilike("%genmaicha%"),
                        Product.name.ilike("%earl grey%")
                    )
                )
            elif cat_clean in ["sodas-kombucha", "soda", "kombucha", "sparkling", "tonics"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%soda%"),
                        Product.name.ilike("%kombucha%"),
                        Product.name.ilike("%sparkling%"),
                        Product.name.ilike("%tonic%"),
                        Product.name.ilike("%water%")
                    )
                )
            elif cat_clean in ["audio", "earbuds", "headphones", "speakers", "sound"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%earbuds%"),
                        Product.name.ilike("%headphones%"),
                        Product.name.ilike("%speaker%"),
                        Product.name.ilike("%microphone%")
                    )
                )
            elif cat_clean in ["chargers", "power", "power bank", "cables"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%charger%"),
                        Product.name.ilike("%power bank%"),
                        Product.name.ilike("%charging%"),
                        Product.name.ilike("%powerbank%"),
                        Product.name.ilike("%cable%")
                    )
                )
            elif cat_clean in ["watch", "smartwatch", "wearables", "fitness tracker", "band"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%watch%"),
                        Product.name.ilike("%band%"),
                        Product.name.ilike("%tracker%")
                    )
                )
            elif cat_clean in ["workstation", "desk", "accessories"]:
                base_query = base_query.filter(
                    or_(
                        Product.name.ilike("%keyboard%"),
                        Product.name.ilike("%mouse%"),
                        Product.name.ilike("%webcam%"),
                        Product.name.ilike("%stand%"),
                        Product.name.ilike("%hub%"),
                        Product.name.ilike("%lamp%"),
                        Product.name.ilike("%bulb%"),
                        Product.name.ilike("%purifier%"),
                        Product.name.ilike("%light%")
                    )
                )
            elif cat_clean in ["honey", "oil", "nuts", "seeds", "grains", "tea", "coffee", "snacks", "dairy-alt"]:
                base_query = base_query.filter(Product.category == cat_clean)
            else:
                base_query = base_query.filter(
                    or_(
                        Product.category.ilike(f"%{category.strip()}%"),
                        Product.name.ilike(f"%{category.strip()}%")
                    )
                )

        # Smart query / synonym search
        if query and query.strip():
            raw_q = query.strip()
            q_lower = raw_q.lower()
            terms = f"%{raw_q}%"

            search_conditions = [
                Product.name.ilike(terms),
                Product.description.ilike(terms),
            ]
            # Only match category directly if query isn't specifically looking for shoes
            if not any(w in q_lower for w in ["shoe", "shoes", "sneaker", "sneakers", "loafer", "loafers", "footwear"]):
                search_conditions.append(Product.category.ilike(terms))

            # Synonym expansions
            if any(w in q_lower for w in ["sabji", "sabzi", "vegetable", "veggie", "taza"]):
                search_conditions.append(Product.category == "fresh-groceries")
                search_conditions.append(Product.name.ilike("%tomato%"))
                search_conditions.append(Product.name.ilike("%palak%"))
                search_conditions.append(Product.name.ilike("%onion%"))
                search_conditions.append(Product.name.ilike("%potato%"))
            if any(w in q_lower for w in ["shoe", "footwear", "sneaker", "loafer", "boots"]):
                search_conditions.append(Product.name.ilike("%shoe%"))
                search_conditions.append(Product.name.ilike("%sneaker%"))
                search_conditions.append(Product.name.ilike("%loafer%"))
                search_conditions.append(Product.name.ilike("%slip-on%"))
            if any(w in q_lower for w in ["pant", "trouser", "chino", "jeans", "jogger", "bottom"]):
                search_conditions.append(Product.name.ilike("%pant%"))
                search_conditions.append(Product.name.ilike("%trouser%"))
                search_conditions.append(Product.name.ilike("%chino%"))
                search_conditions.append(Product.name.ilike("%jeans%"))
                search_conditions.append(Product.name.ilike("%jogger%"))
            if "shirt" in q_lower and "t-shirt" not in q_lower and "tshirt" not in q_lower:
                search_conditions.append(Product.name.ilike("%shirt%"))
            if any(w in q_lower for w in ["t-shirt", "tshirt", "tee"]):
                search_conditions.append(Product.name.ilike("%t-shirt%"))
                search_conditions.append(Product.name.ilike("%tee%"))
            if any(w in q_lower for w in ["drink", "beverage", "juice", "sharbat"]):
                search_conditions.append(Product.category == "beverages-drinks")
                search_conditions.append(Product.name.ilike("%juice%"))
                search_conditions.append(Product.name.ilike("%drink%"))
            if any(w in q_lower for w in ["electronic", "gadget", "tech", "device"]):
                search_conditions.append(Product.category == "electronics")

            base_query = base_query.filter(or_(*search_conditions))

        if min_price is not None:
            base_query = base_query.filter(Product.price >= min_price)

        if max_price is not None:
            base_query = base_query.filter(Product.price <= max_price)

        if is_organic is not None:
            base_query = base_query.filter(Product.is_organic == (1 if is_organic else 0))

        if is_featured is not None:
            base_query = base_query.filter(Product.is_featured == is_featured)

        if min_rating is not None and min_rating > 0:
            base_query = base_query.filter(func.coalesce(rating_subq.c.avg_rating, 0.0) >= min_rating)

        total_count = base_query.count()

        # Sorting
        if sort_by == "price_asc":
            base_query = base_query.order_by(asc(Product.price))
        elif sort_by == "price_desc":
            base_query = base_query.order_by(desc(Product.price))
        elif sort_by == "rating_desc":
            base_query = base_query.order_by(desc("avg_rating"))
        elif sort_by == "newest":
            base_query = base_query.order_by(desc(Product.id))
        else:
            base_query = base_query.order_by(desc(Product.is_featured), desc("avg_rating"), Product.id)

        rows = base_query.offset(offset).limit(limit).all()

        products = []
        for prod, avg_rating, rev_count in rows:
            products.append({
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
                "average_rating": float(avg_rating or 0.0),
                "review_count": int(rev_count or 0),
                "created_at": prod.created_at,
            })

        return products, total_count

    @staticmethod
    def get_product_by_id(db: Session, product_id: int) -> Optional[Dict]:
        prod = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
        if not prod:
            return None

        # Fetch reviews
        reviews = db.query(Review).filter(Review.product_id == product_id).order_by(desc(Review.created_at)).all()
        avg_rating = db.query(func.round(func.avg(Review.rating), 2)).filter(Review.product_id == product_id).scalar() or 0.0

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
            "average_rating": float(avg_rating),
            "review_count": len(reviews),
            "created_at": prod.created_at,
            "reviews": [
                {
                    "id": r.id,
                    "product_id": r.product_id,
                    "rating": r.rating,
                    "reviewer_name": r.reviewer_name,
                    "review_text": r.review_text,
                    "created_at": r.created_at,
                    "is_verified": r.is_verified
                }
                for r in reviews
            ]
        }

    @staticmethod
    def get_categories(db: Session) -> List[Dict]:
        categories = db.query(Category).all()
        if not categories:
            # Fallback to distinct product categories
            raw_cats = db.query(Product.category).distinct().filter(Product.category.isnot(None)).all()
            return [{"id": i + 1, "name": c[0].capitalize(), "slug": c[0], "description": None, "image_url": None} for i, c in enumerate(raw_cats)]
        return [{"id": c.id, "name": c.name, "slug": c.slug, "description": c.description, "image_url": c.image_url} for c in categories]
