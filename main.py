import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db, engine
from models import Base, Furniture, Location, Inventory
from pydantic import BaseModel
import google.generativeai as genai

# Ensure tables are created
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RouteRequest(BaseModel):
    location_ids: List[int]

@app.post("/api/route-plan")
def generate_route_plan(request: RouteRequest, db: Session = Depends(get_db)):
    if not GEMINI_API_KEY:
        return {"error": "GEMINI_API not configured"}
        
    locations = db.query(Location).filter(Location.id.in_(request.location_ids)).all()
    
    # Gather inventory for these locations to give context to Gemini
    inventory_summary = []
    for loc in locations:
        inv = db.query(Inventory).filter(Inventory.location_id == loc.id).all()
        items = [f"{i.quantity}x {i.furniture.name}" for i in inv]
        inventory_summary.append(f"Stop: {loc.name} ({loc.address})\nItems to handle:\n" + "\n".join(items))
        
    prompt = f"""
    You are an expert logistics AI for Vesta Home. 
    A dispatcher is creating a route for the following stops and furniture items:
    
    {''.join(inventory_summary)}
    
    Based on the items listed, recommend the ideal box truck size (e.g. 10ft, 16ft, 26ft) and the number of movers required. 
    Also provide a brief 1-2 sentence explanation for your recommendation.
    Output your response in this exact format:
    Truck: [Truck Size]
    Movers: [Number]
    Reason: [Explanation]
    """
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = response.text
        
        # Parse the response loosely
        lines = text.split('\n')
        truck = "16ft Box Truck"
        movers = "2 Movers"
        reason = "Standard allocation based on typical furniture volume."
        
        for line in lines:
            if line.startswith("Truck:"): truck = line.replace("Truck:", "").strip()
            if line.startswith("Movers:"): movers = line.replace("Movers:", "").strip()
            if line.startswith("Reason:"): reason = line.replace("Reason:", "").strip()
            
        return {
            "truck": truck,
            "movers": movers,
            "reason": reason
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/")
def read_root():
    return {"Hello": "Welcome to Vesta Home Logistics API"}

@app.get("/api/furniture")
def get_furniture(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    furniture = db.query(Furniture).offset(skip).limit(limit).all()
    return furniture

@app.get("/api/locations")
def get_locations(db: Session = Depends(get_db)):
    # Get locations with a count of inventory items
    locations = db.query(Location).all()
    results = []
    for loc in locations:
        inventory_count = db.query(func.sum(Inventory.quantity)).filter(Inventory.location_id == loc.id).scalar() or 0
        results.append({
            "id": loc.id,
            "name": loc.name,
            "address": loc.address,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "is_warehouse": loc.is_warehouse,
            "inventory_count": inventory_count
        })
    return results

@app.get("/api/locations/{location_id}/inventory")
def get_location_inventory(location_id: int, db: Session = Depends(get_db)):
    inventory = db.query(Inventory).filter(Inventory.location_id == location_id).all()
    results = []
    for inv in inventory:
        results.append({
            "id": inv.id,
            "quantity": inv.quantity,
            "status": inv.status,
            "furniture": {
                "id": inv.furniture.id,
                "name": inv.furniture.name,
                "image_url": inv.furniture.image_url,
                "price": inv.furniture.price
            }
        })
    return results


