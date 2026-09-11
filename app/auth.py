import hashlib
import os
import time
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db

SECRET_KEY = "grocery_direct_secret_jwt_key_super_secure"
ALGORITHM = "HS256"
TOKEN_EXPIRE_SECONDS = 86400 * 7 # 7 days

security = HTTPBearer()

def hash_password(password: str) -> str:
    # PBKDF2 HMAC SHA256 for secure hashing
    salt = b"grocery_app_salt_2026"
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return pwd_hash.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode.update({"exp": int(time.time()) + TOKEN_EXPIRE_SECONDS})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub_val = payload.get("sub")
        if sub_val is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        user_id = int(sub_val)
    except jwt.PyJWTError as err:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Could not validate token: {str(err)}")
    
    conn = get_db()
    user = conn.execute("SELECT id, name, email, role, phone, address FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return dict(user)

def require_role(allowed_roles: list):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not allowed for role '{current_user['role']}'"
            )
        return current_user
    return role_checker
