const { queryAll, queryGet, queryRun } = require('../config/database');
const { generateUpiUri, generateQrBase64 } = require('../utils/qrGenerator');

async function createOrder(req, res) {
  try {
    const { shop_id, delivery_address, notes, order_type, items } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ detail: "Order must contain at least one item" });
    }

    const shop = await queryGet("SELECT id FROM shops WHERE id = ?", [shop_id]);
    if (!shop) {
      return res.status(404).json({ detail: "Selected store does not exist" });
    }

    const orderResult = await queryRun(
      `INSERT INTO orders (customer_id, shop_id, order_type, status, delivery_address, notes)
       VALUES (?, ?, ?, 'PENDING_PRICE', ?, ?)`,
      [req.user.id, shop_id, order_type || 'custom', delivery_address.trim(), notes || null]
    );

    const orderId = orderResult.lastID;
    for (const item of items) {
      await queryRun(
        `INSERT INTO order_items (order_id, item_name, requested_quantity, requested_unit, final_quantity, available)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [orderId, item.item_name.trim(), item.requested_quantity, item.requested_unit.trim(), item.requested_quantity]
      );
    }

    return res.status(201).json({
      message: "Order placed successfully. Waiting for shopkeeper final price quote.",
      order_id: orderId
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function getOrders(req, res) {
  try {
    let orders = [];
    if (req.user.role === 'customer') {
      orders = await queryAll(
        `SELECT o.*, s.shop_name, s.phone as shop_phone, s.upi_id as shop_upi_id
         FROM orders o
         JOIN shops s ON o.shop_id = s.id
         WHERE o.customer_id = ?
         ORDER BY o.created_at DESC`,
        [req.user.id]
      );
    } else { // shopkeeper
      const shop = await queryGet("SELECT id FROM shops WHERE user_id = ?", [req.user.id]);
      if (!shop) return res.json([]);
      orders = await queryAll(
        `SELECT o.*, u.name as customer_name, u.phone as customer_phone
         FROM orders o
         JOIN users u ON o.customer_id = u.id
         WHERE o.shop_id = ?
         ORDER BY o.created_at DESC`,
        [shop.id]
      );
    }

    const result = [];
    for (const o of orders) {
      const items = await queryAll("SELECT * FROM order_items WHERE order_id = ?", [o.id]);
      result.push({ ...o, items });
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function getOrderDetails(req, res) {
  try {
    const { orderId } = req.params;
    const order = await queryGet(
      `SELECT o.*, s.shop_name, s.owner_name as shop_owner, s.address as shop_address, s.phone as shop_phone, s.upi_id as shop_upi_id,
              u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       JOIN users u ON o.customer_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (!order) {
      return res.status(404).json({ detail: "Order not found" });
    }

    const items = await queryAll("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
    return res.json({ ...order, items });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function setOrderPricing(req, res) {
  try {
    const { orderId } = req.params;
    const { delivery_fee = 0.0, items } = req.body;

    const shop = await queryGet("SELECT id, shop_name, upi_id FROM shops WHERE user_id = ?", [req.user.id]);
    if (!shop) {
      return res.status(400).json({ detail: "Shop profile not found" });
    }

    const order = await queryGet("SELECT * FROM orders WHERE id = ? AND shop_id = ?", [orderId, shop.id]);
    if (!order) {
      return res.status(404).json({ detail: "Order not found" });
    }

    let subtotal = 0.0;
    for (const pItem of items) {
      const availableVal = pItem.available ? 1 : 0;
      const dbItem = await queryGet("SELECT requested_quantity FROM order_items WHERE id=? AND order_id=?", [pItem.item_id, orderId]);
      const reqQty = dbItem ? dbItem.requested_quantity : 1.0;
      const finalQty = availableVal ? (pItem.final_quantity !== undefined ? pItem.final_quantity : reqQty) : 0.0;
      const itemTotal = availableVal ? pItem.unit_price * finalQty : 0.0;

      await queryRun(
        `UPDATE order_items 
         SET unit_price=?, final_quantity=?, available=?, item_total=?
         WHERE id=? AND order_id=?`,
        [pItem.unit_price, finalQty, availableVal, itemTotal, pItem.item_id, orderId]
      );

      if (availableVal) subtotal += itemTotal;
    }

    const totalAmount = subtotal + delivery_fee;

    // Generate UPI URI and Base64 QR Code
    const upiUri = generateUpiUri(shop.upi_id, shop.shop_name, totalAmount, orderId);
    const qrBase64 = await generateQrBase64(upiUri);

    await queryRun(
      `UPDATE orders 
       SET subtotal=?, delivery_fee=?, total_amount=?, status='PRICED', qr_code_data=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [subtotal, delivery_fee, totalAmount, qrBase64, orderId]
    );

    return res.json({
      message: "Order priced successfully and QR code generated",
      subtotal,
      delivery_fee,
      total_amount: totalAmount,
      qr_code_data: qrBase64,
      upi_uri: upiUri
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function submitPayment(req, res) {
  try {
    const { orderId } = req.params;
    const { payment_ref, payment_notes } = req.body;

    if (!payment_ref || !payment_ref.trim()) {
      return res.status(400).json({ detail: "Transaction reference / UTR is required" });
    }

    const order = await queryGet("SELECT * FROM orders WHERE id = ? AND customer_id = ?", [orderId, req.user.id]);
    if (!order) {
      return res.status(404).json({ detail: "Order not found" });
    }

    await queryRun(
      `UPDATE orders 
       SET status='PAID', payment_ref=?, payment_notes=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [payment_ref.trim(), payment_notes || null, orderId]
    );

    return res.json({
      message: "Payment reference submitted successfully! The shopkeeper will verify and dispatch your order.",
      status: "PAID"
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    await queryRun(
      "UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
      [status, orderId]
    );

    return res.json({ message: `Order status updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderDetails,
  setOrderPricing,
  submitPayment,
  updateOrderStatus
};
