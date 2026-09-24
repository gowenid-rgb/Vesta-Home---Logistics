from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db, engine
from models import Base, Furniture

# Ensure tables are created
Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "Welcome to Vesta Home Logistics API"}

@app.get("/api/furniture")
def get_furniture(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    furniture = db.query(Furniture).offset(skip).limit(limit).all()
    return furniture

