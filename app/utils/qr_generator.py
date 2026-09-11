import qrcode
import io
import base64
import urllib.parse

def generate_upi_uri(upi_id: str, payee_name: str, amount: float, order_id: int) -> str:
    """
    Generates standard Indian UPI URI format:
    upi://pay?pa=store@upi&pn=Store%20Name&am=1250.00&cu=INR&tn=Order_12
    """
    params = {
        "pa": upi_id,
        "pn": payee_name,
        "am": f"{amount:.2f}",
        "cu": "INR",
        "tn": f"Order #{order_id} Grocery Payment"
    }
    return f"upi://pay?{urllib.parse.urlencode(params)}"

def generate_qr_base64(data_string: str) -> str:
    """
    Generates a base64 encoded PNG image for the given string (e.g., UPI URI).
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=4,
    )
    qr.add_data(data_string)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    binary_data = buffer.getvalue()
    base64_encoded = base64.b64encode(binary_data).decode("utf-8")
    return f"data:image/png;base64,{base64_encoded}"
