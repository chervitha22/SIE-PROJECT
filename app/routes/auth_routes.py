from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import get_db
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str # 'customer' or 'shopkeeper'
    phone: Optional[str] = None
    address: Optional[str] = None
    # Shopkeeper optional fields during registration
    shop_name: Optional[str] = None
    upi_id: Optional[str] = None
    area_pincode: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
def register(req: RegisterRequest):
    if req.role not in ['customer', 'shopkeeper']:
        raise HTTPException(status_code=400, detail="Role must be 'customer' or 'shopkeeper'")
    
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (req.email.lower().strip(),)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Email is already registered")
    
    pwd_hash = hash_password(req.password)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (name, email, password_hash, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
        (req.name.strip(), req.email.lower().strip(), pwd_hash, req.role, req.phone, req.address)
    )
    user_id = cursor.lastrowid
    
    # If registering as shopkeeper, initialize shop profile automatically
    shop_id = None
    if req.role == 'shopkeeper':
        shop_name = req.shop_name.strip() if req.shop_name else f"{req.name.strip()}'s Kirana Store"
        upi_id = req.upi_id.strip() if req.upi_id else f"{req.phone or 'store'}@upi"
        cursor.execute(
            """INSERT INTO shops (user_id, shop_name, owner_name, address, area_pincode, phone, upi_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, shop_name, req.name.strip(), req.address or "Main Street", req.area_pincode or "560001", req.phone or "9999999999", upi_id)
        )
        shop_id = cursor.lastrowid

    conn.commit()
    conn.close()
    
    token = create_access_token({"sub": str(user_id), "role": req.role})
    return {
        "message": "User registered successfully",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": req.name,
            "email": req.email,
            "role": req.role,
            "shop_id": shop_id
        }
    }

@router.post("/login")
def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email.lower().strip(),)).fetchone()
    if not user or not verify_password(req.password, user["password_hash"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_dict = dict(user)
    shop_id = None
    if user_dict["role"] == "shopkeeper":
        shop = conn.execute("SELECT id FROM shops WHERE user_id = ?", (user_dict["id"],)).fetchone()
        if shop:
            shop_id = shop["id"]

    conn.close()
    
    token = create_access_token({"sub": str(user_dict["id"]), "role": user_dict["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_dict["id"],
            "name": user_dict["name"],
            "email": user_dict["email"],
            "role": user_dict["role"],
            "phone": user_dict["phone"],
            "address": user_dict["address"],
            "shop_id": shop_id
        }
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    shop_info = None
    if current_user["role"] == "shopkeeper":
        shop = conn.execute("SELECT * FROM shops WHERE user_id = ?", (current_user["id"],)).fetchone()
        if shop:
            shop_info = dict(shop)
    conn.close()
    
    res = dict(current_user)
    if shop_info:
        res["shop"] = shop_info
    return res
