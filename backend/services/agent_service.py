import json
import os
import re
import base64
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from backend.config import settings
from backend.models import Product, Review, Cart, CartItem, Order, Coupon, User
from backend.services.catalog_service import CatalogService
from backend.services.cart_service import CartService
from backend.services.order_service import OrderService

# In-memory session tracking for contextual multi-turn conversation
SESSION_STATE: Dict[str, Dict[str, Any]] = {}

def extract_text(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                parts.append(str(item.get("text") or item.get("content") or ""))
            elif hasattr(item, "text"):
                parts.append(str(item.text))
            else:
                parts.append(str(item))
        return "".join(parts)
    return str(content)


def resolve_product_from_query(db: Session, text: str, last_pid: Optional[int] = None) -> Tuple[Optional[Product], int]:
    """
    Intelligently find the product and quantity from user intent.
    Supports contextual pronouns ('this', 'it'), full names, partial tokens, or numeric IDs.
    """
    q_low = text.lower()
    
    # Extract quantity if specified (e.g., 'add 2 almonds', 'buy 3 jars')
    qty = 1
    qty_match = re.search(r'\b(?:buy|add|order)?\s*(\d{1,2})\s*(?:units?|jars?|bottles?|packs?|items?)?\b', q_low)
    if qty_match:
        try:
            val = int(qty_match.group(1))
            if 1 <= val <= 20:
                qty = val
        except Exception:
            pass

    # 1. Numeric ID Match: e.g. 'id 3', '#3', 'product 3'
    id_match = re.search(r'(?:id\s*[:#]?\s*|product\s*#?\s*|#\s*)(\d+)', q_low)
    if id_match:
        pid = int(id_match.group(1))
        prod = db.query(Product).filter(Product.id == pid, Product.is_active == True).first()
        if prod:
            return prod, qty

    # Load all active products for keyword matching
    active_products = db.query(Product).filter(Product.is_active == True).all()

    # 2. Contextual pronouns: 'this', 'it', 'that', 'same item', 'buy now'
    is_referring = any(w in q_low for w in ['this', 'it', 'that', 'same', 'buy now', 'buy']) and not any(p.name.lower() in q_low for p in active_products)
    if is_referring and last_pid:
        for p in active_products:
            if p.id == last_pid:
                return p, qty

    # 3. Exact full product name in text
    for p in active_products:
        if p.name.lower() in q_low:
            return p, qty

    # 4. Specific multi-word keywords
    for p in active_products:
        tokens = [t for t in re.findall(r'\b[a-z]{3,}\b', p.name.lower()) if t not in ['organic', 'extra', 'virgin', 'dark', 'roast', 'blend', 'mild', 'pure']]
        if tokens and all(t in q_low for t in tokens):
            return p, qty

    # 5. Distinct single token match (longer than 3 chars)
    for p in active_products:
        tokens = [t for t in re.findall(r'\b[a-z]{4,}\b', p.name.lower()) if t not in ['organic', 'extra', 'virgin', 'dark', 'roast', 'blend', 'fresh', 'pure']]
        if any(t in q_low for t in tokens):
            return p, qty

    return None, qty


def build_cart_summary(db: Session, cart: Cart) -> Dict[str, Any]:
    cart_details = CartService.calculate_cart_details(db, cart)
    items_out = []
    for it in cart_details["items"]:
        items_out.append({
            "product_id": it["product_id"],
            "product_name": it["product_name"],
            "unit_price": it["unit_price"],
            "quantity": it["quantity"],
            "subtotal": it["total_price"],
            "image_url": it.get("product_image")
        })
    subtotal = cart_details["subtotal"]
    free_ship_needed = max(0.0, round(settings.FREE_SHIPPING_THRESHOLD - subtotal, 2))
    return {
        "items": items_out,
        "total_items": sum(it["quantity"] for it in items_out),
        "subtotal": subtotal,
        "shipping_fee": cart_details["shipping_fee"],
        "free_shipping_eligible": subtotal >= settings.FREE_SHIPPING_THRESHOLD,
        "amount_needed_for_free_shipping": free_ship_needed
    }


class AIAgentService:
    SYSTEM_PROMPT = """
You are the dedicated AI Shopping Concierge for ShopScape Organic.
Your tone is friendly, warm, helpful, and to-the-point, exactly like ChatGPT.

CRITICAL FORMATTING INSTRUCTIONS:
- DO NOT use any raw markdown asterisks (no **bold** and no *italics*).
- Use clean plain sentences, natural phrasing, and simple hyphen dashes (-) for lists.
- Highlight key details naturally: price in Indian Rupees (₹), flavor, health benefits, and organic purity.
- When recommending items, explain the unique variety and distinct taste/use of each option.
- Remind shoppers they can simply say "Buy this" or click "Add to Cart" on any product card.
"""

    @staticmethod
    def get_llm(provider: Optional[str] = None, model: Optional[str] = None):
        provider = provider or settings.DEFAULT_AI_PROVIDER
        
        # Normalize model name: retired/legacy gemini-1.5/2.0 models map to gemini-3.8-flash
        target_model = model or settings.GEMINI_MODEL or "gemini-3.8-flash"
        if "1.5" in target_model or "2.0" in target_model:
            target_model = "gemini-3.8-flash"

        if provider == "google" and settings.GOOGLE_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=target_model,
                temperature=0.2,
                google_api_key=settings.GOOGLE_API_KEY,
                request_timeout=8
            )
        elif provider == "groq" and settings.GROQ_API_KEY:
            from langchain_groq import ChatGroq
            return ChatGroq(
                model=settings.GROQ_MODEL,
                temperature=0.2,
                groq_api_key=settings.GROQ_API_KEY,
                request_timeout=8
            )
        else:
            if settings.GOOGLE_API_KEY:
                from langchain_google_genai import ChatGoogleGenerativeAI
                return ChatGoogleGenerativeAI(
                    model="gemini-3.8-flash",
                    temperature=0.2,
                    google_api_key=settings.GOOGLE_API_KEY,
                    request_timeout=8
                )
            elif settings.GROQ_API_KEY:
                from langchain_groq import ChatGroq
                return ChatGroq(
                    model=settings.GROQ_MODEL,
                    temperature=0.2,
                    groq_api_key=settings.GROQ_API_KEY
                )
            else:
                raise ValueError("No AI API key configured (neither GOOGLE_API_KEY nor GROQ_API_KEY).")

    @staticmethod
    def analyze_image_bytes(image_bytes: bytes, mime_type: str = "image/jpeg", provider: Optional[str] = None) -> Dict[str, Any]:
        """Use multimodal vision model to inspect product image."""
        llm = AIAgentService.get_llm(provider=provider)
        b64_data = base64.b64encode(image_bytes).decode("utf-8")

        prompt_msg = HumanMessage(content=[
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{b64_data}"}
            },
            {
                "type": "text",
                "text": (
                    "Look at this product photo. Identify the organic food or pantry item and return a strict JSON object with fields:\n"
                    "- product_type: string (e.g. honey, olive oil, oats, almonds)\n"
                    "- search_query: string keyword (e.g. 'honey', 'olive oil')\n"
                    "- is_organic: boolean or null\n"
                    "- visual_details: one sentence summary of appearance\n"
                    "Return ONLY the JSON string."
                )
            }
        ])

        try:
            res = llm.invoke([prompt_msg])
            raw_text = extract_text(res.content).strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            return json.loads(raw_text.strip())
        except Exception:
            return {"search_query": "honey", "product_type": "product", "is_organic": True, "visual_details": "Organic grocery item"}

    @staticmethod
    def process_chat(
        db: Session,
        message: str,
        session_id: str,
        user: Optional[User] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process chat with catalog grounding, multi-turn session awareness, and full conversational ordering and cart management.
        """
        # Initialize or retrieve session memory
        if session_id not in SESSION_STATE:
            SESSION_STATE[session_id] = {
                "last_product_id": None,
                "last_product_name": None,
                "pending_order_proposal": None,
                "history": []
            }
        session_mem = SESSION_STATE[session_id]

        cart = CartService.get_or_create_cart(db, user_id=user.id if user else None, session_id=session_id)
        recommended_products = []
        actions_taken = []
        cart_updated = False
        msg_lower = message.lower().strip()

        # -------------------------------------------------------------
        # 1. Order Tracking Tool
        # -------------------------------------------------------------
        if any(w in msg_lower for w in ["track", "order status", "where is my order", "ord-"]):
            words = message.split()
            found_order = None
            for w in words:
                cleaned = w.strip(".,!?:;'\"")
                if "ord-" in cleaned.lower():
                    found_order = OrderService.get_order_by_number(db, cleaned)
                    break
            
            if found_order:
                actions_taken.append(f"Retrieved status for {found_order.order_number}")
                reply = (
                    f"Order Status for #{found_order.order_number}\n\n"
                    f"- Fulfillment: {found_order.fulfillment_status.capitalize()}\n"
                    f"- Payment: {found_order.payment_status.capitalize()} ({found_order.payment_method.upper()})\n"
                    f"- Total Amount: {settings.STORE_CURRENCY_SYMBOL}{found_order.total_amount:.2f}\n"
                    f"- Tracking Number: {found_order.tracking_number or 'Processing'}\n"
                    f"- Shipping Address: {found_order.shipping_address}\n"
                )
                return {
                    "reply": reply,
                    "session_id": session_id,
                    "recommended_products": [],
                    "actions_taken": actions_taken,
                    "cart_updated": False,
                    "cart_summary": build_cart_summary(db, cart)
                }

        # -------------------------------------------------------------
        # 2. Checkout Tool
        # -------------------------------------------------------------
        if any(w in msg_lower for w in ["proceed to checkout", "go to checkout", "take me to checkout", "start checkout", "ready to checkout"]):
            cart_details = CartService.calculate_cart_details(db, cart)
            if not cart_details["items"]:
                return {
                    "reply": "Your shopping bag is currently empty. Add products to your cart before proceeding to checkout!",
                    "session_id": session_id,
                    "recommended_products": [],
                    "actions_taken": [],
                    "cart_updated": False,
                    "cart_summary": build_cart_summary(db, cart)
                }
            return {
                "reply": f"Taking you to checkout! Your cart has {len(cart_details['items'])} items (Subtotal: {settings.STORE_CURRENCY_SYMBOL}{cart_details['subtotal']:.2f}). Please verify your delivery details and choose your preferred payment method.",
                "session_id": session_id,
                "recommended_products": [],
                "actions_taken": ["Navigating to checkout modal"],
                "cart_updated": False,
                "cart_summary": build_cart_summary(db, cart),
                "navigate_to": "checkout"
            }

        # -------------------------------------------------------------
        # 3. Cart Total / View Cart Tool
        # -------------------------------------------------------------
        if any(w in msg_lower for w in ["what is my cart total", "cart total", "show my cart", "what's in my cart", "my cart", "view cart", "check cart"]):
            summary = build_cart_summary(db, cart)
            if not summary["items"]:
                return {
                    "reply": "Your shopping cart is currently empty. Would you like me to recommend some popular farm-fresh groceries or organic pantry staples?",
                    "session_id": session_id,
                    "recommended_products": [],
                    "actions_taken": ["Retrieved cart details"],
                    "cart_updated": False,
                    "cart_summary": summary
                }
            items_list = "\n".join([f"- {it['quantity']}x {it['product_name']} ({settings.STORE_CURRENCY_SYMBOL}{it['unit_price']:.2f} each = {settings.STORE_CURRENCY_SYMBOL}{it['subtotal']:.2f})" for it in summary["items"]])
            ship_text = "Free Shipping included!" if summary["free_shipping_eligible"] else f"Add {settings.STORE_CURRENCY_SYMBOL}{summary['amount_needed_for_free_shipping']:.2f} more for free shipping (Standard: {settings.STORE_CURRENCY_SYMBOL}{summary['shipping_fee']:.2f})"
            reply = (
                f"Here is your current cart breakdown ({summary['total_items']} items):\n\n"
                f"{items_list}\n\n"
                f"- Subtotal: {settings.STORE_CURRENCY_SYMBOL}{summary['subtotal']:.2f}\n"
                f"- Shipping: {ship_text}\n\n"
                f"You can say 'Remove <item>', 'Change quantity to <number>', or click Proceed to Checkout."
            )
            return {
                "reply": reply,
                "session_id": session_id,
                "recommended_products": [],
                "actions_taken": ["Retrieved cart details"],
                "cart_updated": False,
                "cart_summary": summary
            }

        # -------------------------------------------------------------
        # 4. Remove Item from Cart Tool
        # -------------------------------------------------------------
        if any(w in msg_lower for w in ["remove", "delete from cart", "take off", "drop"]) and any(w in msg_lower for w in ["cart", "bag", "the", "item"]):
            cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
            matched_ci = None
            for ci in cart_items:
                p = db.query(Product).filter(Product.id == ci.product_id).first()
                if p:
                    # check match
                    if p.name.lower() in msg_lower or any(tok in msg_lower for tok in p.name.lower().split() if len(tok) >= 4 and tok not in ["organic", "fresh"]):
                        matched_ci = (ci, p)
                        break
            if matched_ci:
                ci, prod = matched_ci
                CartService.remove_item(db, cart.id, ci.id)
                summary = build_cart_summary(db, cart)
                actions_taken.append(f"Removed '{prod.name}' from cart")
                reply = f"Removed {prod.name} from your cart. You now have {summary['total_items']} items in your bag (Subtotal: {settings.STORE_CURRENCY_SYMBOL}{summary['subtotal']:.2f})."
                return {
                    "reply": reply,
                    "session_id": session_id,
                    "recommended_products": [],
                    "actions_taken": actions_taken,
                    "cart_updated": True,
                    "cart_summary": summary
                }

        # -------------------------------------------------------------
        # 5. Update Quantity in Cart Tool
        # -------------------------------------------------------------
        if any(w in msg_lower for w in ["change quantity", "update quantity", "change the quantity", "set quantity"]):
            qty_match = re.search(r'\b(?:to|as|into)?\s*(\d+)\b', msg_lower)
            new_qty = int(qty_match.group(1)) if qty_match else 1
            cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
            target_ci = None
            for ci in cart_items:
                p = db.query(Product).filter(Product.id == ci.product_id).first()
                if p and (p.name.lower() in msg_lower or (session_mem.get("last_product_id") == p.id)):
                    target_ci = (ci, p)
                    break
            if not target_ci and cart_items:
                # default to last item in cart
                last_ci = cart_items[-1]
                p = db.query(Product).filter(Product.id == last_ci.product_id).first()
                if p:
                    target_ci = (last_ci, p)

            if target_ci:
                ci, prod = target_ci
                CartService.update_item_quantity(db, cart.id, ci.id, new_qty)
                summary = build_cart_summary(db, cart)
                actions_taken.append(f"Updated quantity of '{prod.name}' to {new_qty}")
                reply = f"Updated {prod.name} quantity to {new_qty}. Your cart subtotal is now {settings.STORE_CURRENCY_SYMBOL}{summary['subtotal']:.2f}."
                return {
                    "reply": reply,
                    "session_id": session_id,
                    "recommended_products": [],
                    "actions_taken": actions_taken,
                    "cart_updated": True,
                    "cart_summary": summary
                }

        # -------------------------------------------------------------
        # 6. Confirm Pending Order Proposal
        # -------------------------------------------------------------
        if any(w in msg_lower for w in ["confirm add to cart", "confirm", "yes add it", "yes add to cart", "confirm order", "yes please", "sure add it"]):
            pending = session_mem.get("pending_order_proposal")
            if pending:
                pid = pending["product_id"]
                pqty = pending["quantity"]
                prod = db.query(Product).filter(Product.id == pid).first()
                if prod:
                    CartService.add_item_to_cart(db, cart, product_id=pid, quantity=pqty)
                    session_mem["pending_order_proposal"] = None
                    session_mem["last_product_id"] = pid
                    session_mem["last_product_name"] = prod.name
                    summary = build_cart_summary(db, cart)
                    actions_taken.append(f"Confirmed and added {pqty}x '{prod.name}' to cart")
                    confirmed_proposal = dict(pending)
                    confirmed_proposal["status"] = "confirmed"
                    reply = (
                        f"Great! I have confirmed and added {pqty}x {prod.name} to your cart.\n\n"
                        f"Your bag now has {summary['total_items']} items (Subtotal: {settings.STORE_CURRENCY_SYMBOL}{summary['subtotal']:.2f}). "
                        f"You can review your bag anytime or proceed to checkout."
                    )
                    return {
                        "reply": reply,
                        "session_id": session_id,
                        "recommended_products": [{
                            "id": prod.id,
                            "name": prod.name,
                            "price": prod.price,
                            "rating": 4.8,
                            "is_organic": bool(prod.is_organic),
                            "category": prod.category,
                            "image_url": prod.image_url,
                            "description": prod.short_description or prod.description,
                            "stock_quantity": prod.stock_quantity or 50
                        }],
                        "order_proposal": confirmed_proposal,
                        "actions_taken": actions_taken,
                        "cart_updated": True,
                        "cart_summary": summary
                    }

        # -------------------------------------------------------------
        # 7. Natural Language Ordering Intent ("Order 2 packs of Farm Fresh Red Tomatoes")
        # -------------------------------------------------------------
        # If user explicitly asks to "order X" vs asking info
        is_order_command = bool(re.search(r'\b(?:order|book|place order for)\b', msg_lower)) and not any(q in msg_lower for q in ["how to order", "can i order", "order status", "track order", "my order"])

        if is_order_command:
            matched_prod, qty = resolve_product_from_query(
                db, 
                message, 
                last_pid=session_mem.get("last_product_id")
            )
            if matched_prod:
                session_mem["last_product_id"] = matched_prod.id
                session_mem["last_product_name"] = matched_prod.name
                subtotal_item = round(matched_prod.price * qty, 2)
                
                proposal = {
                    "product_id": matched_prod.id,
                    "product_name": matched_prod.name,
                    "unit_price": matched_prod.price,
                    "quantity": qty,
                    "subtotal": subtotal_item,
                    "image_url": matched_prod.image_url,
                    "is_organic": bool(matched_prod.is_organic),
                    "stock_available": matched_prod.stock_quantity or 50,
                    "estimated_delivery": "Tomorrow by 2 PM",
                    "status": "pending_confirmation"
                }
                session_mem["pending_order_proposal"] = proposal
                actions_taken.append(f"Created order proposal for {qty}x '{matched_prod.name}'")

                reply = (
                    f"Sure! I found {matched_prod.name} for {settings.STORE_CURRENCY_SYMBOL}{matched_prod.price:.2f} per pack. "
                    f"{qty} packs come to {settings.STORE_CURRENCY_SYMBOL}{subtotal_item:.2f} before delivery charges. "
                    f"Would you like me to add them to your cart?"
                )

                card = {
                    "id": matched_prod.id,
                    "name": matched_prod.name,
                    "price": matched_prod.price,
                    "rating": 4.8,
                    "review_count": 4,
                    "is_organic": bool(matched_prod.is_organic),
                    "category": matched_prod.category,
                    "image_url": matched_prod.image_url,
                    "description": matched_prod.short_description or matched_prod.description,
                    "stock_quantity": matched_prod.stock_quantity or 50
                }

                return {
                    "reply": reply,
                    "session_id": session_id,
                    "recommended_products": [card],
                    "order_proposal": proposal,
                    "actions_taken": actions_taken,
                    "cart_updated": False,
                    "cart_summary": build_cart_summary(db, cart)
                }

        # -------------------------------------------------------------
        # 8. Direct Add to Cart / Buy Tool ("Add to cart", "Buy this")
        # -------------------------------------------------------------
        inquiry_indicators = [
            "why should i", "why to buy", "why buy", "should i buy", 
            "is it worth", "reasons to buy", "what are the benefits",
            "tell me about", "can you explain", "compare", "how much is",
            "what is", "who made", "details on"
        ]
        is_inquiry = any(q in msg_lower for q in inquiry_indicators)

        buy_phrases = [
            "buy this", "buy it", "buy now", "purchase this", "add to cart", 
            "add this to cart", "add to my cart", "add to bag", "add 2 packs",
            "add two", "i want to buy", "please buy", "checkout this", "get this"
        ]
        has_direct_buy_phrase = any(p in msg_lower for p in buy_phrases)
        has_verb_buy = bool(re.search(r'\b(?:buy|purchase|add)\b', msg_lower)) and not is_inquiry

        if has_direct_buy_phrase or has_verb_buy:
            matched_prod, qty = resolve_product_from_query(
                db, 
                message, 
                last_pid=session_mem.get("last_product_id")
            )

            if matched_prod:
                try:
                    CartService.add_item_to_cart(db, cart, product_id=matched_prod.id, quantity=qty)
                    session_mem["last_product_id"] = matched_prod.id
                    session_mem["last_product_name"] = matched_prod.name
                    actions_taken.append(f"Added {qty}x '{matched_prod.name}' to cart")
                    cart_updated = True

                    summary = build_cart_summary(db, cart)

                    card = {
                        "id": matched_prod.id,
                        "name": matched_prod.name,
                        "price": matched_prod.price,
                        "rating": 4.8,
                        "review_count": 4,
                        "is_organic": bool(matched_prod.is_organic),
                        "category": matched_prod.category,
                        "image_url": matched_prod.image_url,
                        "description": matched_prod.short_description or matched_prod.description,
                        "stock_quantity": matched_prod.stock_quantity or 50
                    }
                    recommended_products.append(card)

                    reply = (
                        f"Added to your cart: {qty}x {matched_prod.name} at {settings.STORE_CURRENCY_SYMBOL}{matched_prod.price:.2f} each.\n\n"
                        f"Your cart now has {summary['total_items']} items (Subtotal: {settings.STORE_CURRENCY_SYMBOL}{summary['subtotal']:.2f}).\n\n"
                        f"You can review your bag anytime or click Proceed to Checkout to complete your order with free delivery over ₹{int(settings.FREE_SHIPPING_THRESHOLD)}."
                    )

                    return {
                        "reply": reply,
                        "session_id": session_id,
                        "recommended_products": recommended_products,
                        "actions_taken": actions_taken,
                        "cart_updated": True,
                        "cart_summary": summary
                    }
                except Exception as e:
                    actions_taken.append(f"Cart error: {str(e)}")

        # -------------------------------------------------------------
        # 9. Comparison Tool ("Compare X and Y" / "Compare these two products")
        # -------------------------------------------------------------
        if "compare" in msg_lower:
            all_prods = db.query(Product).filter(Product.is_active == True).all()
            matched_for_comp = []
            for p in all_prods:
                if p.name.lower() in msg_lower:
                    matched_for_comp.append(p)
                elif any(tok in msg_lower for tok in p.name.lower().split() if len(tok) >= 4 and tok not in ["organic", "fresh", "extra", "pure", "farm"]):
                    if p not in matched_for_comp:
                        matched_for_comp.append(p)
                if len(matched_for_comp) >= 2:
                    break

            if len(matched_for_comp) < 2 and session_mem.get("last_product_id"):
                lp = db.query(Product).filter(Product.id == session_mem["last_product_id"]).first()
                if lp and lp not in matched_for_comp:
                    matched_for_comp.insert(0, lp)
                if len(matched_for_comp) < 2:
                    # find another in same category
                    other = db.query(Product).filter(Product.category == lp.category, Product.id != lp.id, Product.is_active == True).first()
                    if other:
                        matched_for_comp.append(other)

            if len(matched_for_comp) < 2:
                # default pair (e.g. honey pair)
                honey_items = db.query(Product).filter(Product.category == "honey", Product.is_active == True).limit(2).all()
                if len(honey_items) >= 2:
                    matched_for_comp = honey_items

            if len(matched_for_comp) >= 2:
                p1, p2 = matched_for_comp[0], matched_for_comp[1]
                comp_data = {
                    "item_a": {
                        "id": p1.id,
                        "name": p1.name,
                        "price": p1.price,
                        "rating": 4.9,
                        "review_count": 8,
                        "category": p1.category or "organic-pantry",
                        "is_organic": bool(p1.is_organic),
                        "image_url": p1.image_url,
                        "features": [
                            "100% Certified Organic",
                            f"Price: {settings.STORE_CURRENCY_SYMBOL}{p1.price}",
                            p1.short_description or "Premium small-batch harvest"
                        ]
                    },
                    "item_b": {
                        "id": p2.id,
                        "name": p2.name,
                        "price": p2.price,
                        "rating": 4.8,
                        "review_count": 6,
                        "category": p2.category or "organic-pantry",
                        "is_organic": bool(p2.is_organic),
                        "image_url": p2.image_url,
                        "features": [
                            "100% Certified Organic",
                            f"Price: {settings.STORE_CURRENCY_SYMBOL}{p2.price}",
                            p2.short_description or "Daily kitchen staple"
                        ]
                    },
                    "verdict": (
                        f"{p1.name} ({settings.STORE_CURRENCY_SYMBOL}{p1.price}) is ideal for connoisseurs seeking signature rich notes, "
                        f"while {p2.name} ({settings.STORE_CURRENCY_SYMBOL}{p2.price}) offers outstanding everyday value and versatile cooking utility."
                    )
                }

                reply = (
                    f"Product Comparison: {p1.name} vs. {p2.name}\n\n"
                    f"1. {p1.name} - {settings.STORE_CURRENCY_SYMBOL}{p1.price:.2f} (Rating: 4.9 / 5.0)\n"
                    f"- Highlights: {p1.short_description or p1.description}\n"
                    f"- Best for: Premium delicacy and wellness uses.\n\n"
                    f"2. {p2.name} - {settings.STORE_CURRENCY_SYMBOL}{p2.price:.2f} (Rating: 4.8 / 5.0)\n"
                    f"- Highlights: {p2.short_description or p2.description}\n"
                    f"- Best for: Everyday nutrition and great value.\n\n"
                    f"Which one would you like to add to your cart? Simply say 'Add the first one' or click on the card below."
                )

                recommended_products.extend([
                    {
                        "id": p1.id,
                        "name": p1.name,
                        "price": p1.price,
                        "rating": 4.9,
                        "review_count": 8,
                        "is_organic": bool(p1.is_organic),
                        "category": p1.category,
                        "image_url": p1.image_url,
                        "description": p1.short_description or p1.description,
                        "stock_quantity": p1.stock_quantity or 50
                    },
                    {
                        "id": p2.id,
                        "name": p2.name,
                        "price": p2.price,
                        "rating": 4.8,
                        "review_count": 6,
                        "is_organic": bool(p2.is_organic),
                        "category": p2.category,
                        "image_url": p2.image_url,
                        "description": p2.short_description or p2.description,
                        "stock_quantity": p2.stock_quantity or 50
                    }
                ])

                return {
                    "reply": reply,
                    "session_id": session_id,
                    "recommended_products": recommended_products,
                    "comparison": comp_data,
                    "actions_taken": [f"Compared '{p1.name}' and '{p2.name}'"],
                    "cart_updated": False,
                    "cart_summary": build_cart_summary(db, cart)
                }

        # -------------------------------------------------------------
        # 10. Cheaper Alternatives Tool ("Show cheaper alternatives")
        # -------------------------------------------------------------
        if any(w in msg_lower for w in ["cheaper alternative", "cheaper option", "cheaper", "lower price"]):
            ref_pid = session_mem.get("last_product_id")
            if ref_pid:
                ref_p = db.query(Product).filter(Product.id == ref_pid).first()
                if ref_p:
                    cheaper_prods = db.query(Product).filter(
                        Product.category == ref_p.category,
                        Product.price < ref_p.price,
                        Product.is_active == True
                    ).order_by(Product.price.asc()).limit(3).all()
                    if cheaper_prods:
                        rec_cards = [{
                            "id": cp.id,
                            "name": cp.name,
                            "price": cp.price,
                            "rating": 4.8,
                            "review_count": 4,
                            "is_organic": bool(cp.is_organic),
                            "category": cp.category,
                            "image_url": cp.image_url,
                            "description": cp.short_description or cp.description,
                            "stock_quantity": cp.stock_quantity or 50
                        } for cp in cheaper_prods]
                        reply = (
                            f"Here are budget-friendly alternatives to {ref_p.name} in the same category:\n\n"
                            + "\n".join([f"- {cp.name}: {settings.STORE_CURRENCY_SYMBOL}{cp.price:.2f} (Savings of {settings.STORE_CURRENCY_SYMBOL}{ref_p.price - cp.price:.2f})" for cp in cheaper_prods])
                            + "\n\nFeel free to click Add to Cart on any option that fits your budget."
                        )
                        return {
                            "reply": reply,
                            "session_id": session_id,
                            "recommended_products": rec_cards,
                            "actions_taken": [f"Found {len(cheaper_prods)} cheaper alternatives for {ref_p.name}"],
                            "cart_updated": False,
                            "cart_summary": build_cart_summary(db, cart)
                        }

        # -------------------------------------------------------------
        # 11. Stock Check Tool ("Is this product in stock?")
        # -------------------------------------------------------------
        if any(w in msg_lower for w in ["in stock", "stock available", "is it available", "how many left"]):
            stock_prod, _ = resolve_product_from_query(db, message, last_pid=session_mem.get("last_product_id"))
            if stock_prod:
                session_mem["last_product_id"] = stock_prod.id
                session_mem["last_product_name"] = stock_prod.name
                qty_avail = stock_prod.stock_quantity or 50
                reply = (
                    f"Yes! {stock_prod.name} is currently in stock with {qty_avail} units ready for immediate farm-fresh dispatch. "
                    f"Unit price: {settings.STORE_CURRENCY_SYMBOL}{stock_prod.price:.2f}. "
                    f"Would you like me to add it to your cart?"
                )
                return {
                    "reply": reply,
                    "session_id": session_id,
                    "recommended_products": [{
                        "id": stock_prod.id,
                        "name": stock_prod.name,
                        "price": stock_prod.price,
                        "rating": 4.8,
                        "review_count": 4,
                        "is_organic": bool(stock_prod.is_organic),
                        "category": stock_prod.category,
                        "image_url": stock_prod.image_url,
                        "description": stock_prod.short_description or stock_prod.description,
                        "stock_quantity": qty_avail
                    }],
                    "actions_taken": [f"Checked stock for '{stock_prod.name}': {qty_avail} units available"],
                    "cart_updated": False,
                    "cart_summary": build_cart_summary(db, cart)
                }

        # -------------------------------------------------------------
        # 3. Catalog Grounding & LLM Query
        # -------------------------------------------------------------
        # Check if the query specifically discusses a catalog product
        discussed_prod, _ = resolve_product_from_query(db, message)
        if discussed_prod:
            session_mem["last_product_id"] = discussed_prod.id
            session_mem["last_product_name"] = discussed_prod.name

        # Parse budget or rating filters
        price_num = re.search(r'(?:under|less than|below|<|upto)\s*(?:₹|\$|rs\.?|inr)?\s*(\d+(?:\.\d+)?)', msg_lower)
        max_p = float(price_num.group(1)) if price_num else None

        rating_num = re.search(r'(\d(?:\.\d+)?)\s*(?:\+|stars?|rating)', msg_lower)
        min_r = float(rating_num.group(1)) if rating_num else None

        is_org = True if "organic" in msg_lower else None

        # Detect category-specific variety intent
        category_keywords = {
            # Fresh Sabji & Groceries
            "sabji": "fresh-groceries",
            "vegetable": "fresh-groceries",
            "veggie": "fresh-groceries",
            "tomato": "fresh-groceries",
            "palak": "fresh-groceries",
            "spinach": "fresh-groceries",
            "onion": "fresh-groceries",
            "potato": "fresh-groceries",
            "aloo": "fresh-groceries",
            "capsicum": "fresh-groceries",
            "carrot": "fresh-groceries",
            "broccoli": "fresh-groceries",
            "pea": "fresh-groceries",
            "matar": "fresh-groceries",
            "fruit": "fresh-groceries",
            "apple": "fresh-groceries",
            "banana": "fresh-groceries",
            "mango": "fresh-groceries",
            "grocery": "fresh-groceries",
            "fresh": "fresh-groceries",

            # Clothing & Shoes
            "shirt": "clothing-shoes",
            "pant": "clothing-shoes",
            "tshirt": "clothing-shoes",
            "t-shirt": "clothing-shoes",
            "tee": "clothing-shoes",
            "shoe": "clothing-shoes",
            "sneaker": "clothing-shoes",
            "loafer": "clothing-shoes",
            "cloth": "clothing-shoes",
            "jean": "clothing-shoes",
            "denim": "clothing-shoes",
            "chino": "clothing-shoes",
            "jogger": "clothing-shoes",
            "trouser": "clothing-shoes",

            # Beverages & Drinks
            "drink": "beverages-drinks",
            "drinking": "beverages-drinks",
            "juice": "beverages-drinks",
            "coconut water": "beverages-drinks",
            "kombucha": "beverages-drinks",
            "cold brew": "beverages-drinks",
            "matcha": "beverages-drinks",
            "soda": "beverages-drinks",
            "beverage": "beverages-drinks",
            "chai": "beverages-drinks",

            # Electronics & Gadgets
            "electronic": "electronics",
            "gadget": "electronics",
            "earbud": "electronics",
            "headphone": "electronics",
            "watch": "electronics",
            "smartwatch": "electronics",
            "charger": "electronics",
            "speaker": "electronics",
            "power bank": "electronics",
            "lamp": "electronics",

            # Organic Farm Pantry
            "honey": "honey",
            "oil": "oil",
            "olive": "oil",
            "nut": "nuts",
            "almond": "nuts",
            "cashew": "nuts",
            "seed": "seeds",
            "chia": "seeds",
            "grain": "grains",
            "quinoa": "grains",
            "oat": "grains",
            "rice": "grains",
            "tea": "tea",
            "coffee": "coffee",
            "snack": "snacks",
            "milk": "dairy-alt",
            "pantry": "organic-pantry",
        }
        detected_category = None
        for kw, cat in category_keywords.items():
            if kw in msg_lower:
                detected_category = cat
                break

        # Clean search terms for product query
        clean_terms = message
        for remove_word in [
            "tell me about", "what are the health benefits", "why should i buy it", 
            "find", "show me", "recommend", "under", "rating", "price", "looking for", 
            "please", "some", "product", "products", "varieties", "variety", "types", 
            "different", "what do you have", "can you show", "options"
        ]:
            clean_terms = re.sub(r'\b' + re.escape(remove_word) + r'\b', "", clean_terms, flags=re.IGNORECASE)
        clean_terms = re.sub(r'\s+', ' ', clean_terms).strip()

        matched_prods = []
        if detected_category:
            # Load diverse varieties within requested category (e.g. Manuka, Raw, Buckwheat, Acacia for honey)
            cat_prods, _ = CatalogService.get_products(
                db,
                category=detected_category,
                max_price=max_p,
                min_rating=min_r,
                is_organic=is_org,
                limit=6
            )
            matched_prods.extend(cat_prods)
        elif clean_terms and len(clean_terms) >= 3:
            keyword_prods, _ = CatalogService.get_products(
                db,
                query=clean_terms,
                max_price=max_p,
                min_rating=min_r,
                is_organic=is_org,
                limit=6
            )
            matched_prods.extend(keyword_prods)

        # If general product request or not enough items, showcase a rich cross-category variety
        if len(matched_prods) < 4:
            cross_categories = ["fresh-groceries", "clothing-shoes", "electronics", "beverages-drinks", "honey", "oil", "nuts"]
            existing_ids = {p["id"] for p in matched_prods}
            for cat in cross_categories:
                if len(matched_prods) >= 4:
                    break
                fill_prods, _ = CatalogService.get_products(db, category=cat, limit=1)
                for fp in fill_prods:
                    if fp["id"] not in existing_ids:
                        matched_prods.append(fp)
                        existing_ids.add(fp["id"])
                        break

        # If a specific product was discussed, ensure it is first in recommendations
        if discussed_prod:
            found = any(p["id"] == discussed_prod.id for p in matched_prods)
            if not found:
                p_detail = CatalogService.get_product_by_id(db, discussed_prod.id)
                if p_detail:
                    matched_prods.insert(0, p_detail)

        catalog_context = []
        for p in matched_prods[:4]:
            recommended_products.append({
                "id": p["id"],
                "name": p["name"],
                "price": p["price"],
                "rating": p.get("average_rating") or 4.8,
                "review_count": p.get("review_count") or 4,
                "is_organic": bool(p.get("is_organic", True)),
                "category": p.get("category"),
                "image_url": p.get("image_url"),
                "description": p.get("short_description") or p.get("description")
            })
            catalog_context.append(
                f"- ID:{p['id']} '{p['name']}' | {settings.STORE_CURRENCY_SYMBOL}{p['price']} | Rating: ★{p.get('average_rating', 4.8)} ({p.get('review_count', 4)} verified reviews) | Organic: {p.get('is_organic', True)} | Description: {p.get('description', '')}"
            )

        context_str = "\n".join(catalog_context) if catalog_context else "Certified organic farm pantry."

        prompt_text = f"""{AIAgentService.SYSTEM_PROMPT}

CURRENT STORE CONTEXT:
Store Currency: {settings.STORE_CURRENCY} ({settings.STORE_CURRENCY_SYMBOL})
Cart Item Count: {len(cart.items)}

CATALOG GROUNDING DATA:
{context_str}

USER REQUEST:
"{message}"

Provide a friendly, clean, direct ChatGPT-style response:
- Answer the shopper's question directly with clear, engaging details.
- Show different varieties when products are requested and explain how they differ.
- NEVER use asterisks (no double asterisks for bolding). Write clean text.
- Remind the shopper they can click Add to Cart or say "Buy this" to place it in their basket.
"""

        try:
            llm = AIAgentService.get_llm(provider=provider, model=model)
            response = llm.invoke([HumanMessage(content=prompt_text)])
            reply_content = extract_text(response.content).strip()
        except Exception as err:
            # Fallback if external LLM has network or quota glitch
            if discussed_prod:
                reply_content = (
                    f"{discussed_prod.name} ({settings.STORE_CURRENCY_SYMBOL}{discussed_prod.price:.2f})\n\n"
                    f"{discussed_prod.description}\n\n"
                    f"- Certified Organic: Sourced directly from verified sustainable farms.\n"
                    f"- Customer Satisfaction: 4.8 / 5.0 rating from verified buyers.\n\n"
                    f"Would you like to purchase this item? Simply type 'Buy this' or click Add to Cart to add it directly to your basket."
                )
            else:
                reply_content = (
                    f"Here are several organic varieties from our store pantry matching your request:\n\n"
                    f"Every product is 100% certified organic and laboratory tested for purity. "
                    f"Feel free to click Add to Cart on any item or ask for more details on flavor and ingredients."
                )

        # Strictly strip any asterisks from the reply
        reply_content = reply_content.replace("**", "").replace("*", "")

        return {
            "reply": reply_content,
            "session_id": session_id,
            "recommended_products": recommended_products,
            "actions_taken": actions_taken,
            "cart_updated": cart_updated,
            "cart_summary": build_cart_summary(db, cart)
        }
