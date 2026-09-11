from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.auth import require_role

router = APIRouter(prefix="/api/lists", tags=["Monthly Lists"])

class ListItemSchema(BaseModel):
    item_name: str
    quantity: float
    unit: str # kg, g, L, ml, packet, piece, bottle, box
    notes: Optional[str] = None

class ListCreateSchema(BaseModel):
    title: str
    description: Optional[str] = None
    items: List[ListItemSchema]

@router.get("")
def get_user_lists(current_user: dict = Depends(require_role(["customer"]))):
    conn = get_db()
    lists = conn.execute("SELECT * FROM monthly_lists WHERE user_id = ? ORDER BY created_at DESC", (current_user["id"],)).fetchall()
    
    result = []
    for l in lists:
        list_dict = dict(l)
        items = conn.execute("SELECT * FROM monthly_list_items WHERE list_id = ?", (l["id"],)).fetchall()
        list_dict["items"] = [dict(i) for i in items]
        result.append(list_dict)
        
    conn.close()
    return result

@router.post("")
def create_monthly_list(req: ListCreateSchema, current_user: dict = Depends(require_role(["customer"]))):
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="List title is required")
    if not req.items:
        raise HTTPException(status_code=400, detail="At least one item is required in the monthly list")
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO monthly_lists (user_id, title, description) VALUES (?, ?, ?)",
        (current_user["id"], req.title.strip(), req.description)
    )
    list_id = cursor.lastrowid
    
    for item in req.items:
        cursor.execute(
            "INSERT INTO monthly_list_items (list_id, item_name, quantity, unit, notes) VALUES (?, ?, ?, ?, ?)",
            (list_id, item.item_name.strip(), item.quantity, item.unit.strip(), item.notes)
        )
        
    conn.commit()
    conn.close()
    return {"message": "Monthly grocery list created successfully", "list_id": list_id}

@router.get("/{list_id}")
def get_monthly_list(list_id: int, current_user: dict = Depends(require_role(["customer"]))):
    conn = get_db()
    mlist = conn.execute("SELECT * FROM monthly_lists WHERE id = ? AND user_id = ?", (list_id, current_user["id"])).fetchone()
    if not mlist:
        conn.close()
        raise HTTPException(status_code=404, detail="Monthly list not found")
    
    items = conn.execute("SELECT * FROM monthly_list_items WHERE list_id = ?", (list_id,)).fetchall()
    conn.close()
    
    res = dict(mlist)
    res["items"] = [dict(i) for i in items]
    return res

@router.put("/{list_id}")
def update_monthly_list(list_id: int, req: ListCreateSchema, current_user: dict = Depends(require_role(["customer"]))):
    conn = get_db()
    cursor = conn.cursor()
    mlist = conn.execute("SELECT id FROM monthly_lists WHERE id = ? AND user_id = ?", (list_id, current_user["id"])).fetchone()
    if not mlist:
        conn.close()
        raise HTTPException(status_code=404, detail="Monthly list not found")
    
    cursor.execute(
        "UPDATE monthly_lists SET title=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        (req.title.strip(), req.description, list_id)
    )
    cursor.execute("DELETE FROM monthly_list_items WHERE list_id=?", (list_id,))
    
    for item in req.items:
        cursor.execute(
            "INSERT INTO monthly_list_items (list_id, item_name, quantity, unit, notes) VALUES (?, ?, ?, ?, ?)",
            (list_id, item.item_name.strip(), item.quantity, item.unit.strip(), item.notes)
        )
        
    conn.commit()
    conn.close()
    return {"message": "Monthly grocery list updated successfully"}

@router.delete("/{list_id}")
def delete_monthly_list(list_id: int, current_user: dict = Depends(require_role(["customer"]))):
    conn = get_db()
    cursor = conn.cursor()
    mlist = conn.execute("SELECT id FROM monthly_lists WHERE id = ? AND user_id = ?", (list_id, current_user["id"])).fetchone()
    if not mlist:
        conn.close()
        raise HTTPException(status_code=404, detail="Monthly list not found")
    
    cursor.execute("DELETE FROM monthly_lists WHERE id=?", (list_id,))
    conn.commit()
    conn.close()
    return {"message": "Monthly list deleted successfully"}
