import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "grocery_platform.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('customer', 'shopkeeper')),
        phone TEXT,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Shops table (for shopkeepers)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        shop_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        address TEXT NOT NULL,
        area_pincode TEXT,
        phone TEXT NOT NULL,
        upi_id TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Monthly Lists table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS monthly_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Monthly List Items
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS monthly_list_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY(list_id) REFERENCES monthly_lists(id) ON DELETE CASCADE
    )
    """)

    # Orders table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        shop_id INTEGER NOT NULL,
        order_type TEXT DEFAULT 'custom',
        status TEXT NOT NULL CHECK(status IN ('PENDING_PRICE', 'PRICED', 'PAYMENT_PENDING', 'PAID', 'DELIVERED', 'CANCELLED')),
        delivery_address TEXT NOT NULL,
        notes TEXT,
        subtotal REAL DEFAULT 0.0,
        delivery_fee REAL DEFAULT 0.0,
        total_amount REAL DEFAULT 0.0,
        qr_code_data TEXT,
        payment_ref TEXT,
        payment_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES users(id),
        FOREIGN KEY(shop_id) REFERENCES shops(id)
    )
    """)

    # Order Items table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        requested_quantity REAL NOT NULL,
        requested_unit TEXT NOT NULL,
        unit_price REAL DEFAULT 0.0,
        final_quantity REAL,
        available INTEGER DEFAULT 1,
        item_total REAL DEFAULT 0.0,
        FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully!")
