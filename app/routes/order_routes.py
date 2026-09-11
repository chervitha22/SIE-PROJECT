from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.auth import get_current_user, require_role
from app.utils.qr_generator import generate_upi_uri, generate_qr_base64

router = APIRouter(prefix="/api/orders", tags=["Orders"])

class OrderItemInput(BaseModel):
    item_name: str
    requested_quantity: float
    requested_unit: str

class OrderCreateSchema(BaseModel):
    shop_id: int
    delivery_address: str
    notes: Optional[str] = None
    order_type: Optional[str] = "custom" # "monthly_list" or "custom"
    items: List[OrderItemInput]

class ItemPriceUpdate(BaseModel):
    item_id: int
    unit_price: float
    final_quantity: Optional[float] = None
    available: bool = True

class PriceOrderSchema(BaseModel):
    delivery_fee: float = 0.0
    items: List[ItemPriceUpdate]

class SubmitPaymentSchema(BaseModel):
    payment_ref: str
    payment_notes: Optional[str] = None

class StatusUpdateSchema(BaseModel):
    status: str

@router.post("")
def create_order(req: OrderCreateSchema, current_user: dict = Depends(require_role(["customer"]))):
    if not req.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check store existence
    shop = conn.execute("SELECT id FROM shops WHERE id = ?", (req.shop_id,)).fetchone()
    if not shop:
        conn.close()
        raise HTTPException(status_code=404, detail="Selected store does not exist")
    
    cursor.execute(
        """INSERT INTO orders (customer_id, shop_id, order_type, status, delivery_address, notes)
           VALUES (?, ?, ?, 'PENDING_PRICE', ?, ?)""",
        (current_user["id"], req.shop_id, req.order_type, req.delivery_address.strip(), req.notes)
    )
    order_id = cursor.lastrowid
    
    for item in req.items:
        cursor.execute(
            """INSERT INTO order_items (order_id, item_name, requested_quantity, requested_unit, final_quantity, available)
               VALUES (?, ?, ?, ?, ?, 1)""",
            (order_id, item.item_name.strip(), item.requested_quantity, item.requested_unit.strip(), item.requested_quantity)
        )
        
    conn.commit()
    conn.close()
    return {"message": "Order placed successfully. Waiting for shopkeeper final price quote.", "order_id": order_id}

@router.get("")
def get_orders(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    if current_user["role"] == "customer":
        orders = conn.execute(
            """SELECT o.*, s.shop_name, s.phone as shop_phone, s.upi_id as shop_upi_id
               FROM orders o
               JOIN shops s ON o.shop_id = s.id
               WHERE o.customer_id = ?
               ORDER BY o.created_at DESC""",
            (current_user["id"],)
        ).fetchall()
    else: # shopkeeper
        shop = conn.execute("SELECT id FROM shops WHERE user_id = ?", (current_user["id"],)).fetchone()
        if not shop:
            conn.close()
            return []
        orders = conn.execute(
            """SELECT o.*, u.name as customer_name, u.phone as customer_phone
               FROM orders o
               JOIN users u ON o.customer_id = u.id
               WHERE o.shop_id = ?
               ORDER BY o.created_at DESC""",
            (shop["id"],)
        ).fetchall()

    result = []
    for o in orders:
        order_dict = dict(o)
        items = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (o["id"],)).fetchall()
        order_dict["items"] = [dict(i) for i in items]
        result.append(order_dict)

    conn.close()
    return result

@router.get("/{order_id}")
def get_order_details(order_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    order = conn.execute(
        """SELECT o.*, s.shop_name, s.owner_name as shop_owner, s.address as shop_address, s.phone as shop_phone, s.upi_id as shop_upi_id,
                  u.name as customer_name, u.phone as customer_phone
           FROM orders o
           JOIN shops s ON o.shop_id = s.id
           JOIN users u ON o.customer_id = u.id
           WHERE o.id = ?""",
        (order_id,)
    ).fetchone()
    
    if not order:
        conn.close()
        raise HTTPException(status_code=404, detail="Order not found")

    order_dict = dict(order)
    # Check access permission
    if current_user["role"] == "customer" and order_dict["customer_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user["role"] == "shopkeeper":
        shop = conn.execute("SELECT id FROM shops WHERE user_id = ?", (current_user["id"],)).fetchone()
        if not shop or shop["id"] != order_dict["shop_id"]:
            conn.close()
            raise HTTPException(status_code=403, detail="Access denied")

    items = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,)).fetchall()
    order_dict["items"] = [dict(i) for i in items]
    conn.close()
    return order_dict

@router.put("/{order_id}/price")
def set_order_pricing(order_id: int, req: PriceOrderSchema, current_user: dict = Depends(require_role(["shopkeeper"]))):
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify order ownership by shopkeeper
    shop = conn.execute("SELECT id, shop_name, upi_id FROM shops WHERE user_id = ?", (current_user["id"],)).fetchone()
    if not shop:
        conn.close()
        raise HTTPException(status_code=400, detail="Shop profile not found")
        
    order = conn.execute("SELECT * FROM orders WHERE id = ? AND shop_id = ?", (order_id, shop["id"])).fetchone()
    if not order:
        conn.close()
        raise HTTPException(status_code=404, detail="Order not found")

    subtotal = 0.0
    for price_item in req.items:
        available_val = 1 if price_item.available else 0
        db_item = conn.execute("SELECT requested_quantity FROM order_items WHERE id=? AND order_id=?", (price_item.item_id, order_id)).fetchone()
        req_qty = db_item["requested_quantity"] if db_item else 1.0
        final_qty = price_item.final_quantity if price_item.final_quantity is not None else req_qty
        if not available_val:
            final_qty = 0.0
            
        item_total = price_item.unit_price * final_qty if available_val else 0.0
        
        cursor.execute(
            """UPDATE order_items 
               SET unit_price=?, final_quantity=?, available=?, item_total=?
               WHERE id=? AND order_id=?""",
            (price_item.unit_price, final_qty, available_val, item_total, price_item.item_id, order_id)
        )
        if available_val:
            subtotal += item_total

    total_amount = subtotal + req.delivery_fee
    
    # Generate UPI URI and Base64 QR Code
    upi_uri = generate_upi_uri(
        upi_id=shop["upi_id"],
        payee_name=shop["shop_name"],
        amount=total_amount,
        order_id=order_id
    )
    qr_base64 = generate_qr_base64(upi_uri)

    cursor.execute(
        """UPDATE orders 
           SET subtotal=?, delivery_fee=?, total_amount=?, status='PRICED', qr_code_data=?, updated_at=CURRENT_TIMESTAMP
           WHERE id=?""",
        (subtotal, req.delivery_fee, total_amount, qr_base64, order_id)
    )

    conn.commit()
    conn.close()
    return {
        "message": "Order priced successfully and QR code generated",
        "subtotal": subtotal,
        "delivery_fee": req.delivery_fee,
        "total_amount": total_amount,
        "qr_code_data": qr_base64,
        "upi_uri": upi_uri
    }

@router.post("/{order_id}/pay")
def submit_payment(order_id: int, req: SubmitPaymentSchema, current_user: dict = Depends(require_role(["customer"]))):
    if not req.payment_ref.strip():
        raise HTTPException(status_code=400, detail="Transaction reference / UTR is required")
        
    conn = get_db()
    cursor = conn.cursor()
    
    order = conn.execute("SELECT * FROM orders WHERE id = ? AND customer_id = ?", (order_id, current_user["id"])).fetchone()
    if not order:
        conn.close()
        raise HTTPException(status_code=404, detail="Order not found")

    cursor.execute(
        """UPDATE orders 
           SET status='PAID', payment_ref=?, payment_notes=?, updated_at=CURRENT_TIMESTAMP
           WHERE id=?""",
        (req.payment_ref.strip(), req.payment_notes, order_id)
    )

    conn.commit()
    conn.close()
    return {"message": "Payment reference submitted successfully! The shopkeeper will verify and dispatch your order.", "status": "PAID"}

@router.put("/{order_id}/status")
def update_order_status(order_id: int, req: StatusUpdateSchema, current_user: dict = Depends(get_current_user)):
    valid_statuses = ['PENDING_PRICE', 'PRICED', 'PAYMENT_PENDING', 'PAID', 'DELIVERED', 'CANCELLED']
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
        
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        (req.status, order_id)
    )
    conn.commit()
    conn.close()
    return {"message": f"Order status updated to {req.status}"}
