from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db, engine
from models import Base, Furniture, Location, Inventory
from pydantic import BaseModel

# Ensure tables are created
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


