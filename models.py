from sqlalchemy import Column, Integer, String, Text, Float, JSON
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
