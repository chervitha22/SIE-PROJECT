import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import init_db, get_db
from app.auth import hash_password
from app.routes.auth_routes import router as auth_router
from app.routes.store_routes import router as store_router
from app.routes.list_routes import router as list_router
from app.routes.order_routes import router as order_router

init_db()

app = FastAPI(title="GroceryDirect - Local Kirana & Monthly List Platform", version="1.0.0")

# Enable CORS for API clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(store_router)
app.include_router(list_router)
app.include_router(order_router)

def seed_demo_data():
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if demo data exists
    existing_user = cursor.execute("SELECT id FROM users WHERE email = 'shop1@kirana.com'").fetchone()
    if not existing_user:
        pwd_hash = hash_password("password123")
        
        # 1. Shopkeeper 1
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
            ("Ramesh Sharma", "shop1@kirana.com", pwd_hash, "shopkeeper", "9876543210", "12 Market Road, Indiranagar")
        )
        user_id1 = cursor.lastrowid
        cursor.execute(
            """INSERT INTO shops (user_id, shop_name, owner_name, address, area_pincode, phone, upi_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id1, "Sharma General Kirana Store", "Ramesh Sharma", "12 Market Road, Indiranagar", "560038", "9876543210", "sharmakirana@upi")
        )
        
        # 2. Shopkeeper 2
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
            ("Anita Gupta", "shop2@kirana.com", pwd_hash, "shopkeeper", "9812345678", "45 Station Avenue, Koramangala")
        )
        user_id2 = cursor.lastrowid
        cursor.execute(
            """INSERT INTO shops (user_id, shop_name, owner_name, address, area_pincode, phone, upi_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id2, "Gupta Fresh & Monthly Provisions", "Anita Gupta", "45 Station Avenue, Koramangala", "560034", "9812345678", "guptafresh@okaxis")
        )

        # 3. Demo Customer
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
            ("Priya Verma", "customer@gmail.com", pwd_hash, "customer", "9988776655", "Flat 302, Green Valley Apartments, Indiranagar")
        )
        cust_id = cursor.lastrowid
        
        # 4. Demo Monthly List for Priya
        cursor.execute(
            "INSERT INTO monthly_lists (user_id, title, description) VALUES (?, ?, ?)",
            (cust_id, "Standard Monthly Ration (Indiranagar)", "Essential monthly staples for 4 family members")
        )
        list_id = cursor.lastrowid
        
        demo_items = [
            ("Aashirvaad Whole Wheat Atta", 10, "kg", "Prefer 10kg sealed bag"),
            ("Fortune Sunlite Sunflower Oil", 5, "L", "5L Can"),
            ("Basmati Rice (India Gate)", 5, "kg", "Long grain"),
            ("Toor Dal (Premium Quality)", 2, "kg", "Unpolished"),
            ("Tata Salt", 2, "packet", "1kg packets"),
            ("Surf Excel Easy Wash Powder", 3, "kg", "3kg pack"),
            ("Amul Taaza Milk T-Special", 30, "L", "Daily 1L delivery or total")
        ]
        
        for name, qty, unit, note in demo_items:
            cursor.execute(
                "INSERT INTO monthly_list_items (list_id, item_name, quantity, unit, notes) VALUES (?, ?, ?, ?, ?)",
                (list_id, name, qty, unit, note)
            )

        conn.commit()
    conn.close()

seed_demo_data()

# Serve Frontend static files
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")

if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def read_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Backend API is running. Frontend static files loading..."}
