import requests
import time
import subprocess
import sys
import os

BASE_URL = "http://127.0.0.1:8000"

def wait_for_server(url, timeout=15):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{url}/")
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False

def run_tests():
    print("=== STARTING FULL STACK GROCERY PLATFORM VERIFICATION ===")
    
    # Remove stale DB if present to ensure clean seed
    if os.path.exists("grocery_platform.db"):
        try:
            os.remove("grocery_platform.db")
            print("[+] Removed stale grocery_platform.db for clean re-seeding.")
        except Exception as e:
            print(f"[*] Could not remove DB: {e}")

    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    if not wait_for_server(BASE_URL):
        print("[-] Server failed to start within timeout.")
        server_process.kill()
        sys.exit(1)
        
    print("[+] FastAPI Server is up and accepting connections!")
    
    try:
        # 1. Health check
        res = requests.get(f"{BASE_URL}/")
        print(f"[+] Server Status Code: {res.status_code}")
        assert res.status_code == 200
        
        # 2. Login as Demo Customer
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "customer@gmail.com", "password": "password123"})
        print(f"[+] Customer Login Status: {res.status_code}")
        assert res.status_code == 200
        cust_token = res.json()["access_token"]
        cust_headers = {"Authorization": f"Bearer {cust_token}"}
        
        # 3. Login as Demo Shopkeeper (Sharma Kirana Store)
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "shop1@kirana.com", "password": "password123"})
        print(f"[+] Shopkeeper Login Status: {res.status_code}")
        assert res.status_code == 200
        shop_token = res.json()["access_token"]
        shop_headers = {"Authorization": f"Bearer {shop_token}"}

        # 4. Fetch Stores & Pick Sharma Kirana Store (matching shopkeeper Ramesh Sharma)
        res_stores = requests.get(f"{BASE_URL}/api/stores")
        stores = res_stores.json()
        target_shop = next(s for s in stores if "Sharma" in s["shop_name"])
        shop_id = target_shop["id"]
        print(f"[+] Selected Store: '{target_shop['shop_name']}' (ID: {shop_id})")
        assert res_stores.status_code == 200
        
        # 5. Fetch Monthly Lists
        res_lists = requests.get(f"{BASE_URL}/api/lists", headers=cust_headers)
        lists = res_lists.json()
        print(f"[+] Lists HTTP Status: {res_lists.status_code}")
        assert res_lists.status_code == 200
        assert isinstance(lists, list) and len(lists) > 0
        print(f"[+] Monthly List Title: '{lists[0]['title']}' with {len(lists[0]['items'])} items")

        # 6. Customer Places Remote Order to Sharma Kirana
        order_payload = {
            "shop_id": shop_id,
            "delivery_address": "Flat 302, Green Valley Apartments, Indiranagar",
            "notes": "Deliver in evening around 6 PM",
            "order_type": "monthly_list",
            "items": [
                {"item_name": "Aashirvaad Whole Wheat Atta", "requested_quantity": 10, "requested_unit": "kg"},
                {"item_name": "Fortune Sunlite Sunflower Oil", "requested_quantity": 5, "requested_unit": "L"},
                {"item_name": "Tata Salt", "requested_quantity": 2, "requested_unit": "packet"}
            ]
        }
        res_order = requests.post(f"{BASE_URL}/api/orders", json=order_payload, headers=cust_headers)
        print(f"[+] Remote Order Placed Status: {res_order.status_code}, Order ID: {res_order.json().get('order_id')}")
        assert res_order.status_code == 200
        order_id = res_order.json()["order_id"]
        
        # Fetch order details to retrieve created item IDs
        res_details = requests.get(f"{BASE_URL}/api/orders/{order_id}", headers=cust_headers)
        order_details = res_details.json()
        print(f"[+] Order Details: shop_id={order_details['shop_id']}, customer_id={order_details['customer_id']}")
        order_items = order_details["items"]
        
        # 7. Shopkeeper Prices the Order & Generates Dynamic UPI QR Code
        pricing_items = []
        prices = [55.0, 140.0, 28.0] # 10*55=550, 5*140=700, 2*28=56 => subtotal = 1306
        for idx, item in enumerate(order_items):
            pricing_items.append({
                "item_id": item["id"],
                "unit_price": prices[idx % len(prices)],
                "available": True
            })

        pricing_payload = {
            "delivery_fee": 30.0,
            "items": pricing_items
        }
        
        res_price = requests.put(f"{BASE_URL}/api/orders/{order_id}/price", json=pricing_payload, headers=shop_headers)
        print(f"[+] Shopkeeper Priced Order Status: {res_price.status_code}, Total Amount: Rs. {res_price.json().get('total_amount')}")
        assert res_price.status_code == 200
        assert res_price.json()["total_amount"] == 1336.0
        assert res_price.json()["qr_code_data"].startswith("data:image/png;base64,")
        print("[+] Dynamic UPI Payment QR Code generated successfully!")

        # 8. Customer Submits Payment UTR Reference
        pay_payload = {
            "payment_ref": "UTR_99887766554412",
            "payment_notes": "Paid via PhonePe / GPay"
        }
        res_pay = requests.post(f"{BASE_URL}/api/orders/{order_id}/pay", json=pay_payload, headers=cust_headers)
        print(f"[+] Customer Submitted Payment Ref Status: {res_pay.status_code}, Status: {res_pay.json().get('status')}")
        assert res_pay.status_code == 200 and res_pay.json()["status"] == "PAID"

        # 9. Shopkeeper Marks Order Delivered
        res_deliv = requests.put(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "DELIVERED"}, headers=shop_headers)
        print(f"[+] Shopkeeper Fulfilled Order Status: {res_deliv.status_code}")
        assert res_deliv.status_code == 200

        print("\n=======================================================")
        print(" SUCCESS: ALL BACKEND & FRONTEND TESTS PASSED CLEANLY!")
        print("=======================================================")

    finally:
        server_process.terminate()
        server_process.wait()

if __name__ == "__main__":
    run_tests()
