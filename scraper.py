import requests
import time
from bs4 import BeautifulSoup
from database import engine, SessionLocal
from models import Base, Furniture

# Create tables
Base.metadata.create_all(bind=engine)

def clean_html(raw_html):
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    return soup.get_text(separator=" ", strip=True)

def scrape_shopify_products(base_url):
    db = SessionLocal()
    page = 1
    total_products = 0
    
    print(f"Starting scrape for {base_url}")
    while True:
        url = f"{base_url}/products.json?limit=250&page={page}"
        print(f"Fetching page {page}...")
        response = requests.get(url)
        
        if response.status_code != 200:
            print(f"Failed to fetch {url}. Status code: {response.status_code}")
            break
            
        data = response.json()
        products = data.get("products", [])
        
        if not products:
            print("No more products found.")
            break
            
        for p in products:
            shopify_id = str(p.get("id"))
            
            # Check if exists
            existing = db.query(Furniture).filter(Furniture.shopify_id == shopify_id).first()
            if existing:
                continue
                
            title = p.get("title", "")
            body_html = p.get("body_html", "")
            description = clean_html(body_html)
            product_type = p.get("product_type", "")
            tags = ",".join(p.get("tags", []))
            
            variants = p.get("variants", [])
            price = 0.0
            if variants and variants[0].get("price"):
                try:
                    price = float(variants[0]["price"])
                except ValueError:
                    pass
                    
            images = p.get("images", [])
            image_url = ""
            images_json = []
            if images:
                image_url = images[0].get("src", "")
                images_json = [img.get("src") for img in images]
                
            furniture = Furniture(
                shopify_id=shopify_id,
                name=title,
                description=description,
                price=price,
                product_type=product_type,
                tags=tags,
                image_url=image_url,
                images_json=images_json
            )
            db.add(furniture)
            total_products += 1
            
        db.commit()
        print(f"Saved {len(products)} products from page {page}.")
        page += 1
        time.sleep(1) # Polite delay
        
    db.close()
    print(f"Scraping completed. Added {total_products} new products.")

if __name__ == "__main__":
    scrape_shopify_products("https://vestahome.com")
