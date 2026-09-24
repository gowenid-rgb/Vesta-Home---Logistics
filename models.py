from sqlalchemy import Column, Integer, String, Text, Float, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base

class Furniture(Base):
    __tablename__ = "furniture"

    id = Column(Integer, primary_key=True, index=True)
    shopify_id = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    price = Column(Float)
    product_type = Column(String)
    tags = Column(String) # Comma separated
    image_url = Column(String)
    images_json = Column(JSON) # Store all images
    
    # Other potential fields that could be extracted or populated by AI
    materials = Column(String, nullable=True)
    weight = Column(Float, nullable=True)
    dimensions = Column(String, nullable=True)

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    address = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    is_warehouse = Column(Boolean, default=False)
    
class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    furniture_id = Column(Integer, ForeignKey("furniture.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    quantity = Column(Integer, default=1)
    status = Column(String, default="In Storage") # e.g., "In Storage", "Staged", "In Transit"
    
    furniture = relationship("Furniture")
    location = relationship("Location")

