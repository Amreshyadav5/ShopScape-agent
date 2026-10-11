"""
Fix product images and prices in the database.
- Assign unique, appropriate Unsplash images per product
- Convert USD prices to realistic INR prices
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "store.db")

# Per-product unique Unsplash images
PRODUCT_IMAGES = {
    # Honey
    1:  "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80",  # raw honey jar
    2:  "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=600&q=80",  # wildflower honey
    3:  "https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=600&q=80",  # manuka honey
    4:  "https://images.unsplash.com/photo-1618897996318-5a901fa7c2ab?auto=format&fit=crop&w=600&q=80",  # clover honey pouring
    5:  "https://images.unsplash.com/photo-1550411294-2a148a038bf3?auto=format&fit=crop&w=600&q=80",  # dark buckwheat honey
    6:  "https://images.unsplash.com/photo-1601600576337-c1d8a0d1373c?auto=format&fit=crop&w=600&q=80",  # orange blossom / light honey
    7:  "https://images.unsplash.com/photo-1555211652-5c6222f971bc?auto=format&fit=crop&w=600&q=80",  # acacia honey
    8:  "https://images.unsplash.com/photo-1627485937980-221c88ac04f9?auto=format&fit=crop&w=600&q=80",  # creamed honey spread
    # Oils
    9:  "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",  # olive oil bottle
    10: "https://images.unsplash.com/photo-1526459916289-b77a0fb5f5e3?auto=format&fit=crop&w=600&q=80",  # coconut oil jar
    11: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=600&q=80",  # flaxseed oil amber
    12: "https://images.unsplash.com/photo-1579113800032-c38bd7635818?auto=format&fit=crop&w=600&q=80",  # avocado oil green
    # Nuts & Seeds
    13: "https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&w=600&q=80",  # almonds
    14: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80",  # cashews
    15: "https://images.unsplash.com/photo-1560046104-c5d5be0e0c0a?auto=format&fit=crop&w=600&q=80",  # chia seeds
    16: "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=600&q=80",  # mixed nuts bowl
    # Grains
    17: "https://images.unsplash.com/photo-1612257999756-6fdff8fd6f43?auto=format&fit=crop&w=600&q=80",  # quinoa
    18: "https://images.unsplash.com/photo-1525373698358-041e3a460346?auto=format&fit=crop&w=600&q=80",  # rolled oats
    19: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",  # brown rice
    20: "https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=600&q=80",  # steel cut oats
    # Tea & Coffee
    21: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&w=600&q=80",  # green tea cup
    22: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=600&q=80",  # chamomile tea
    23: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",  # ethiopian coffee
    24: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80",  # espresso cup
    # Snacks
    25: "https://images.unsplash.com/photo-1484723091739-30990a2c2915?auto=format&fit=crop&w=600&q=80",  # granola bowl
    26: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=600&q=80",  # rice cakes
    27: "https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=600&q=80",  # dried mango slices
    28: "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=600&q=80",  # trail mix
    # Dairy Alternatives
    29: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",  # almond milk glass
    30: "https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=600&q=80",  # oat milk
    31: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=600&q=80",  # coconut milk
    32: "https://images.unsplash.com/photo-1561501900-3701fa6a0864?auto=format&fit=crop&w=600&q=80",  # soy milk
}

# INR prices (realistic market prices)
PRODUCT_PRICES = {
    1:  299,    # Organic Raw Honey 500g
    2:  249,    # Wildflower Honey 500g
    3:  850,    # Organic Manuka Honey 250g (premium)
    4:  179,    # Clover Honey 500g
    5:  399,    # Organic Buckwheat Honey 500g
    6:  329,    # Orange Blossom Honey 500g
    7:  379,    # Organic Acacia Honey 500g
    8:  219,    # Creamed Honey 400g
    9:  449,    # Organic Extra Virgin Olive Oil 500ml
    10: 299,    # Coconut Oil 500ml
    11: 349,    # Organic Flaxseed Oil 500ml
    12: 499,    # Avocado Oil 250ml
    13: 349,    # Organic Almonds 500g
    14: 299,    # Roasted Cashews 500g
    15: 199,    # Organic Chia Seeds 300g
    16: 399,    # Mixed Nuts 400g
    17: 249,    # Organic Quinoa 500g
    18: 129,    # Rolled Oats 1kg
    19: 189,    # Organic Brown Rice 1kg
    20: 159,    # Steel-Cut Oats 750g
    21: 299,    # Organic Green Tea 50 bags
    22: 199,    # Chamomile Tea 25 bags
    23: 499,    # Organic Ethiopian Coffee 250g
    24: 399,    # Dark Roast Espresso Blend 250g
    25: 279,    # Organic Granola 500g
    26: 149,    # Rice Cakes 150g
    27: 249,    # Organic Dried Mango 200g
    28: 229,    # Trail Mix 400g
    29: 149,    # Organic Almond Milk 1L
    30: 129,    # Oat Milk 1L
    31: 119,    # Organic Coconut Milk 400ml
    32: 99,     # Soy Milk 1L
}

def fix_products():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    for product_id, image_url in PRODUCT_IMAGES.items():
        price = PRODUCT_PRICES.get(product_id)
        c.execute(
            "UPDATE products SET image_url = ?, price = ? WHERE id = ?",
            (image_url, price, product_id)
        )
    
    conn.commit()
    
    # Verify
    c.execute("SELECT id, name, price, image_url FROM products ORDER BY id")
    for row in c.fetchall():
        print(f"ID {row[0]:2d}: {row[1][:35]:<35} INR {row[2]}")
    
    conn.close()
    print("\nProduct images and prices updated successfully.")

if __name__ == "__main__":
    fix_products()
