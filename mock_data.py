import random
from database import SessionLocal, engine
from models import Base, Furniture, Location, Inventory

# Ensure tables are created
Base.metadata.create_all(bind=engine)

locations_data = [
    {"name": "Vesta LA Main Warehouse", "address": "1234 Warehouse Row, Los Angeles, CA 90001", "latitude": 33.9740, "longitude": -118.2405, "is_warehouse": True},
    {"name": "Vesta Downtown Storage", "address": "5678 Industrial Blvd, Los Angeles, CA 90014", "latitude": 34.0410, "longitude": -118.2468, "is_warehouse": True},
    {"name": "Sunset Blvd Estate", "address": "9000 Sunset Blvd, West Hollywood, CA 90069", "latitude": 34.0905, "longitude": -118.3860, "is_warehouse": False},
    {"name": "Beverly Hills Mansion", "address": "1000 N Crescent Dr, Beverly Hills, CA 90210", "latitude": 34.0825, "longitude": -118.4118, "is_warehouse": False},
    {"name": "Malibu Beach House", "address": "22000 Pacific Coast Hwy, Malibu, CA 90265", "latitude": 34.0381, "longitude": -118.6508, "is_warehouse": False},
    {"name": "Santa Monica Penthouse", "address": "100 Ocean Ave, Santa Monica, CA 90402", "latitude": 34.0195, "longitude": -118.5060, "is_warehouse": False},
    {"name": "Hollywood Hills Modern", "address": "2000 Hollywood Blvd, Los Angeles, CA 90068", "latitude": 34.1016, "longitude": -118.3267, "is_warehouse": False},
    {"name": "Silver Lake Bungalow", "address": "3000 Silver Lake Blvd, Los Angeles, CA 90039", "latitude": 34.0909, "longitude": -118.2662, "is_warehouse": False},
    {"name": "Pasadena Craftsman", "address": "4000 Colorado Blvd, Pasadena, CA 91105", "latitude": 34.1438, "longitude": -118.1578, "is_warehouse": False},
    {"name": "Brentwood Contemporary", "address": "5000 San Vicente Blvd, Los Angeles, CA 90049", "latitude": 34.0531, "longitude": -118.4725, "is_warehouse": False},
    {"name": "Venice Canal Home", "address": "6000 Venice Blvd, Venice, CA 90291", "latitude": 33.9870, "longitude": -118.4635, "is_warehouse": False},
    {"name": "Culver City Loft", "address": "7000 Washington Blvd, Culver City, CA 90232", "latitude": 34.0259, "longitude": -118.3970, "is_warehouse": False},
    {"name": "DTLA Highrise", "address": "8000 Figueroa St, Los Angeles, CA 90015", "latitude": 34.0443, "longitude": -118.2618, "is_warehouse": False},
    {"name": "Studio City Family Home", "address": "9000 Ventura Blvd, Studio City, CA 91604", "latitude": 34.1408, "longitude": -118.3965, "is_warehouse": False},
    {"name": "Sherman Oaks Ranch", "address": "10000 Riverside Dr, Sherman Oaks, CA 91423", "latitude": 34.1568, "longitude": -118.4503, "is_warehouse": False},
    {"name": "Encino Estate", "address": "11000 Ventura Blvd, Encino, CA 91436", "latitude": 34.1594, "longitude": -118.5015, "is_warehouse": False},
    {"name": "Woodland Hills Tudor", "address": "12000 Ventura Blvd, Woodland Hills, CA 91364", "latitude": 34.1681, "longitude": -118.6080, "is_warehouse": False},
    {"name": "Calabasas Mediterranean", "address": "13000 Calabasas Rd, Calabasas, CA 91302", "latitude": 34.1539, "longitude": -118.6433, "is_warehouse": False},
    {"name": "Pacific Palisades Retreat", "address": "14000 Sunset Blvd, Pacific Palisades, CA 90272", "latitude": 34.0433, "longitude": -118.5285, "is_warehouse": False},
    {"name": "Manhattan Beach Custom", "address": "15000 Highland Ave, Manhattan Beach, CA 90266", "latitude": 33.8847, "longitude": -118.4109, "is_warehouse": False}
]

def generate_mock_data():
    db = SessionLocal()
    
    # 1. Create Locations
    existing_locations = db.query(Location).count()
    if existing_locations == 0:
        print("Creating 20 mock locations...")
        for data in locations_data:
            loc = Location(**data)
            db.add(loc)
        db.commit()
    else:
        print("Locations already exist.")
        
    locations = db.query(Location).all()
    warehouses = [loc for loc in locations if loc.is_warehouse]
    staging_homes = [loc for loc in locations if not loc.is_warehouse]
    
    # 2. Assign Furniture to Inventory
    existing_inventory = db.query(Inventory).count()
    if existing_inventory == 0:
        print("Assigning furniture to locations...")
        furniture_items = db.query(Furniture).all()
        
        if not furniture_items:
            print("No furniture found! Please run the scraper first.")
            return
            
        for item in furniture_items:
            # 60% chance it's in a warehouse, 40% chance it's staged
            in_warehouse = random.random() < 0.6
            
            if in_warehouse:
                loc = random.choice(warehouses)
                status = "In Storage"
            else:
                loc = random.choice(staging_homes)
                status = "Staged"
                
            inv = Inventory(
                furniture_id=item.id,
                location_id=loc.id,
                quantity=random.randint(1, 4), # Mostly 1, sometimes pairs/sets
                status=status
            )
            db.add(inv)
            
        db.commit()
        print(f"Successfully generated inventory records for {len(furniture_items)} items!")
    else:
        print("Inventory already exists.")
        
    db.close()

if __name__ == "__main__":
    generate_mock_data()
