from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/stores", tags=["Stores"])

class ShopUpdate(BaseModel):
    shop_name: str
    owner_name: str
    address: str
    area_pincode: Optional[str] = None
    phone: str
    upi_id: str

@router.get("")
def list_stores(pincode: Optional[str] = None):
    conn = get_db()
    query = "SELECT * FROM shops WHERE is_active = 1"
    params = []
    if pincode:
        query += " AND area_pincode = ?"
        params.append(pincode)
    
    query += " ORDER BY shop_name ASC"
    shops = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(s) for s in shops]

@router.get("/{shop_id}")
def get_store(shop_id: int):
    conn = get_db()
    shop = conn.execute("SELECT * FROM shops WHERE id = ?", (shop_id,)).fetchone()
    conn.close()
    if not shop:
        raise HTTPException(status_code=404, detail="Store not found")
    return dict(shop)

@router.get("/my-shop/profile")
def get_my_shop(current_user: dict = Depends(require_role(["shopkeeper"]))):
    conn = get_db()
    shop = conn.execute("SELECT * FROM shops WHERE user_id = ?", (current_user["id"],)).fetchone()
    conn.close()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop profile not found")
    return dict(shop)

@router.put("/my-shop/profile")
def update_my_shop(req: ShopUpdate, current_user: dict = Depends(require_role(["shopkeeper"]))):
    conn = get_db()
    cursor = conn.cursor()
    shop = conn.execute("SELECT id FROM shops WHERE user_id = ?", (current_user["id"],)).fetchone()
    
    if shop:
        cursor.execute(
            """UPDATE shops SET shop_name=?, owner_name=?, address=?, area_pincode=?, phone=?, upi_id=?
               WHERE id=?""",
            (req.shop_name, req.owner_name, req.address, req.area_pincode, req.phone, req.upi_id, shop["id"])
        )
    else:
        cursor.execute(
            """INSERT INTO shops (user_id, shop_name, owner_name, address, area_pincode, phone, upi_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (current_user["id"], req.shop_name, req.owner_name, req.address, req.area_pincode, req.phone, req.upi_id)
        )
    
    conn.commit()
    updated_shop = conn.execute("SELECT * FROM shops WHERE user_id = ?", (current_user["id"],)).fetchone()
    conn.close()
    return dict(updated_shop)
