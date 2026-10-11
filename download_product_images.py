import os
import sqlite3
import urllib.request
import json
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "store.db")
PRODUCTS_DIR = os.path.join(BASE_DIR, "resources", "products")
os.makedirs(PRODUCTS_DIR, exist_ok=True)

# Curated authentic Wikipedia / Wikimedia subjects matching the exact product
PRODUCT_SOURCES = {
    1: {"source": "local", "path": "/resources/honey.png"}, # Organic Raw Honey
    2: {"source": "wiki", "title": "Honeycomb", "filename": "wildflower_honey.jpg"}, # Wildflower Honey
    3: {"source": "wiki", "title": "Manuka_honey", "filename": "manuka_honey.jpg"}, # Organic Manuka Honey
    4: {"source": "wiki", "title": "Honey", "filename": "clover_honey.jpg"}, # Clover Honey
    5: {"source": "wiki", "title": "Buckwheat", "filename": "buckwheat_honey.jpg"}, # Organic Buckwheat Honey
    6: {"source": "wiki", "title": "Orange_blossom", "filename": "orange_blossom_honey.jpg"}, # Orange Blossom Honey
    7: {"source": "wiki", "title": "Robinia_pseudoacacia", "filename": "acacia_honey.jpg"}, # Organic Acacia Honey
    8: {"source": "wiki", "title": "Creamed_honey", "filename": "creamed_honey.jpg"}, # Creamed Honey
    9: {"source": "wiki", "title": "Olive_oil", "filename": "olive_oil.jpg"}, # Organic Extra Virgin Olive Oil
    10: {"source": "wiki", "title": "Coconut_oil", "filename": "coconut_oil.jpg"}, # Coconut Oil
    11: {"source": "wiki", "title": "Linseed_oil", "filename": "flaxseed_oil.jpg"}, # Organic Flaxseed Oil
    12: {"source": "wiki", "title": "Avocado_oil", "filename": "avocado_oil.jpg"}, # Avocado Oil
    13: {"source": "wiki", "title": "Almond", "filename": "almonds.jpg"}, # Organic Almonds
    14: {"source": "wiki", "title": "Cashew", "filename": "cashews.jpg"}, # Roasted Cashews
    15: {"source": "wiki", "title": "Chia_seed", "filename": "chia_seeds.jpg"}, # Organic Chia Seeds
    16: {"source": "wiki", "title": "Walnut", "filename": "mixed_nuts.jpg"}, # Mixed Nuts
    17: {"source": "wiki", "title": "Quinoa", "filename": "quinoa.jpg"}, # Organic Quinoa
    18: {"source": "local", "path": "/resources/oats.png"}, # Rolled Oats
    19: {"source": "wiki", "title": "Brown_rice", "filename": "brown_rice.jpg"}, # Organic Brown Rice
    20: {"source": "wiki", "title": "Steel-cut_oats", "filename": "steel_cut_oats.jpg"}, # Steel-Cut Oats
    21: {"source": "wiki", "title": "Green_tea", "filename": "green_tea.jpg"}, # Organic Green Tea
    22: {"source": "wiki", "title": "Chamomile", "filename": "chamomile_tea.jpg"}, # Chamomile Tea
    23: {"source": "wiki", "title": "Coffee_bean", "filename": "ethiopian_coffee.jpg"}, # Organic Ethiopian Coffee
    24: {"source": "wiki", "title": "Espresso", "filename": "espresso_blend.jpg"}, # Dark Roast Espresso Blend
    25: {"source": "wiki", "title": "Granola", "filename": "granola.jpg"}, # Organic Granola
    26: {"source": "wiki", "title": "Rice_cake", "filename": "rice_cakes.jpg"}, # Rice Cakes
    27: {"source": "wiki", "title": "Dried_fruit", "filename": "dried_mango.jpg"}, # Organic Dried Mango
    28: {"source": "wiki", "title": "Trail_mix", "filename": "trail_mix.jpg"}, # Trail Mix
    29: {"source": "wiki", "title": "Almond_milk", "filename": "almond_milk.jpg"}, # Organic Almond Milk
    30: {"source": "wiki", "title": "Oat_milk", "filename": "oat_milk.jpg"}, # Oat Milk
    31: {"source": "wiki", "title": "Coconut_milk", "filename": "coconut_milk.jpg"}, # Organic Coconut Milk
    32: {"source": "wiki", "title": "Soy_milk", "filename": "soy_milk.jpg"}, # Soy Milk
}

def fetch_and_save():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    headers = {"User-Agent": "ShopEaseCatalog/1.0 (contact@shopease.ai)"}
    
    for pid, info in PRODUCT_SOURCES.items():
        if info["source"] == "local":
            img_url = info["path"]
            print(f"[{pid}] Using local asset: {img_url}")
            cursor.execute("UPDATE products SET image_url = ? WHERE id = ?", (img_url, pid))
            continue
            
        filename = info["filename"]
        target_path = os.path.join(PRODUCTS_DIR, filename)
        web_path = f"/resources/products/{filename}"
        
        # Download if not already present
        if not os.path.exists(target_path) or os.path.getsize(target_path) < 1000:
            title = info["title"]
            try:
                summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
                req = urllib.request.Request(summary_url, headers=headers)
                data = json.loads(urllib.request.urlopen(req, timeout=10).read())
                
                img_src = data.get("thumbnail", {}).get("source") or data.get("originalimage", {}).get("source")
                if img_src:
                    img_req = urllib.request.Request(img_src, headers=headers)
                    img_bytes = urllib.request.urlopen(img_req, timeout=15).read()
                    with open(target_path, "wb") as f:
                        f.write(img_bytes)
                    print(f"[{pid}] Downloaded {filename} ({len(img_bytes)} bytes)")
                else:
                    print(f"[{pid}] Warning: No image found for {title}")
                    web_path = "/resources/honey.png" if "honey" in filename else "/resources/oats.png"
            except Exception as e:
                print(f"[{pid}] Error downloading {title}: {e}")
                web_path = "/resources/honey.png" if "honey" in filename else "/resources/oats.png"
            time.sleep(0.2)
        else:
            print(f"[{pid}] Already exists: {filename}")
            
        cursor.execute("UPDATE products SET image_url = ? WHERE id = ?", (web_path, pid))
        
    conn.commit()
    conn.close()
    print("Database product images updated successfully.")

if __name__ == "__main__":
    fetch_and_save()
