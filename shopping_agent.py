import base64
import json
import os
import sqlite3
from typing import Optional

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain.tools import tool
from langchain_core.messages import HumanMessage

from reviews_api import get_product_rating
import setup_db

load_dotenv()

DB_PATH = os.path.join(os.path.dirname(__file__), "store.db")
if not os.path.exists(DB_PATH):
    setup_db.create_database()


def extract_text_content(content) -> str:
    """Extract plain text from string or multimodal list content."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                if "text" in item:
                    parts.append(str(item["text"]))
                elif "content" in item:
                    parts.append(str(item["content"]))
                else:
                    parts.append(str(item))
            elif hasattr(item, "text"):
                parts.append(str(item.text))
            elif isinstance(item, str):
                parts.append(item)
            else:
                parts.append(str(item))
        return "".join(parts)
    return str(content)


def get_llms(provider: Optional[str] = None, api_key: Optional[str] = None, model: Optional[str] = None):
    """
    Return (llm, vision_llm) based on available API keys or chosen provider.
    Supports both Google Gemini and Groq.
    """
    google_key = api_key if provider == "google" else os.getenv("GOOGLE_API_KEY")
    groq_key = api_key if provider == "groq" else os.getenv("GROQ_API_KEY")

    # Auto-detect provider if not specified
    if not provider:
        if google_key:
            provider = "google"
        elif groq_key:
            provider = "groq"
        else:
            provider = "google"

    if provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        key = google_key or os.getenv("GOOGLE_API_KEY")
        if not key:
            raise ValueError("GOOGLE_API_KEY is not set. Please set it in your .env or enter it in the sidebar.")
        selected_model = model or "gemini-3.5-flash"
        llm = ChatGoogleGenerativeAI(model=selected_model, temperature=0, google_api_key=key)
        vision_llm = ChatGoogleGenerativeAI(model=selected_model, temperature=0, google_api_key=key)
        return llm, vision_llm
    elif provider == "groq":
        from langchain_groq import ChatGroq
        key = groq_key or os.getenv("GROQ_API_KEY")
        if not key:
            raise ValueError("GROQ_API_KEY is not set. Please set it in your .env or enter it in the sidebar.")
        selected_model = model or "llama-3.3-70b-versatile"
        llm = ChatGroq(model=selected_model, temperature=0, groq_api_key=key)
        vision_llm = ChatGroq(model="qwen/qwen3.8-27b", temperature=0, groq_api_key=key)
        return llm, vision_llm
    else:
        raise ValueError(f"Unsupported provider: {provider}")



# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@tool
def search_products(query: str = "", max_price: Optional[float] = None, is_organic: Optional[bool] = None) -> str:
    """
    Search the product database by keyword (matched against name, description, and category).
    Optionally filter by maximum price and/or organic status.
    Returns a JSON array of matching products, each with: id, name, category, price,
    description, is_organic.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    sql = "SELECT id, name, category, price, description, is_organic FROM products WHERE 1=1"
    params: list = []

    if query and query.strip():
        sql += " AND (name LIKE ? OR description LIKE ? OR category LIKE ?)"
        like = f"%{query.strip()}%"
        params.extend([like, like, like])

    if max_price is not None:
        sql += " AND price <= ?"
        params.append(float(max_price))

    if is_organic is not None:
        sql += " AND is_organic = ?"
        params.append(1 if is_organic else 0)

    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()

    products = [
        {
            "id":          row[0],
            "name":        row[1],
            "category":    row[2],
            "price":       row[3],
            "description": row[4],
            "is_organic":  bool(row[5]),
        }
        for row in rows
    ]
    return json.dumps(products)


@tool
def get_rating(product_id: int) -> str:
    """
    Get the average customer rating and total review count for a product by its ID.
    Returns a JSON object with: product_id, average_rating, review_count.
    """
    try:
        pid = int(product_id)
    except (ValueError, TypeError):
        return json.dumps({"product_id": product_id, "average_rating": 0.0, "review_count": 0})
    result = get_product_rating(pid)
    return json.dumps(result)


@tool
def checkout(product_id: int) -> str:
    """
    Place an order for the given product ID. Saves the order to the database and returns
    a confirmation message with the order ID, product name, and price.
    """
    try:
        pid = int(product_id)
    except (ValueError, TypeError):
        return f"Error: Invalid product ID {product_id}."

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name, price FROM products WHERE id = ?", (pid,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return f"Error: product with ID {pid} not found."

    name, price = row
    cursor.execute(
        "INSERT INTO orders (product_id, product_name, price) VALUES (?, ?, ?)",
        (pid, name, price),
    )
    order_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return (
        f"Order #{order_id} confirmed! '{name}' has been successfully ordered for ${price:.2f}. "
        f"Your order will arrive in 3-5 business days. Thank you for shopping with us!"
    )


@tool
def describe_product_image(image_path: str) -> str:
    """
    Analyze a product image and return its key attributes as a JSON object.
    Use this when the user uploads a photo of a product they are interested in.
    The returned attributes can be used directly with search_products.
    """
    clean_path = image_path.strip().strip("'\"")
    if not os.path.exists(clean_path):
        return json.dumps({"error": f"Image file not found at {clean_path}"})

    with open(clean_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    ext = os.path.splitext(clean_path)[1].lower().lstrip(".")
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"

    message = HumanMessage(content=[
        {
            "type": "image_url",
            "image_url": {"url": f"data:{mime};base64,{image_data}"},
        },
        {
            "type": "text",
            "text": (
                "Look at this product image and extract its key attributes. "
                "Return ONLY a JSON object with these fields:\n"
                "- product_type: what kind of product it is (e.g. honey, olive oil, almonds)\n"
                "- search_query: a short keyword to search for it (e.g. 'honey', 'olive oil')\n"
                "- is_organic: true if the label says organic, false if not, null if unclear\n"
                "- description: one sentence describing the product"
            ),
        },
    ])

    _, vision_model = get_llms()
    response = vision_model.invoke([message])
    raw = extract_text_content(response.content).strip()

    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]

    return raw.strip()


SYSTEM_PROMPT = (
    "You are a helpful shopping assistant. Follow these rules strictly.\n\n"
    "IMAGE SEARCH — when the user provides an image path:\n"
    "1. Call describe_product_image with the path to identify the product.\n"
    "2. Use the returned search_query and is_organic to call search_products.\n"
    "3. Continue with the BROWSING flow from step 2 onwards.\n\n"
    "BROWSING — when the user describes what they want to buy:\n"
    "1. Call search_products to find matching items (apply any price/organic filters given).\n"
    "2. For each candidate, call get_rating to retrieve its average rating.\n"
    "3. Filter by the user's minimum rating if specified.\n"
    "4. Present qualifying products as a numbered list. For each item use this exact format "
    "   (plain text, no backticks, no code blocks, no bold, no italic):\n\n"
    "   #<number>. <name> (ID:<product_id>) — $<price> ★<rating> — <organic or non-organic>\n\n"
    "   Add a blank line between each product entry for readability. "
    "   Always include (ID:X) so you can reference it later.\n"
    "5. If only one product qualifies, still show it in the list and ask: "
    "   'Would you like to order it? Just say yes or give me the number.'\n"
    "6. Do NOT call checkout at this stage.\n\n"
    "ORDERING — when the user confirms they want to buy (e.g. 'yes', 'sure', 'go ahead', "
    "'order number 2', 'the first one', 'get me #3'):\n"
    "1. Look at your previous message to find the (ID:X) for the chosen product "
    "   (if only one was listed and the user says 'yes', use that product's ID).\n"
    "2. Call checkout with that product_id (the number from (ID:X)).\n"
    "3. Confirm the order to the user in plain text.\n\n"
    "Never place an order unless the user explicitly confirms. "
    "Never guess a product_id — always take it from the (ID:X) in your own previous message."
)

TOOLS = [search_products, get_rating, checkout, describe_product_image]


def build_agent(provider: Optional[str] = None, api_key: Optional[str] = None, model: Optional[str] = None):
    """Build and return a LangChain agent instance."""
    llm, _ = get_llms(provider=provider, api_key=api_key, model=model)
    return create_agent(
        tools=TOOLS,
        model=llm,
        system_prompt=SYSTEM_PROMPT,
    )



class LazyAgentProxy:
    """Proxy object so 'from shopping_agent import agent' works without immediate crashes."""
    def __init__(self):
        self._cached_agent = None

    def invoke(self, *args, **kwargs):
        if self._cached_agent is None:
            self._cached_agent = build_agent()
        return self._cached_agent.invoke(*args, **kwargs)

    def reset(self):
        self._cached_agent = None


agent = LazyAgentProxy()


if __name__ == "__main__":
    import sys
    if sys.stdout.encoding.lower() != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    test_result = agent.invoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": (
                        "I want to buy organic honey with 4.5+ rating and less than $20 price."
                    ),
                }
            ]
        }
    )
    print(extract_text_content(test_result["messages"][-1].content))

