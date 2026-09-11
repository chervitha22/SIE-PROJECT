const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryGet, queryRun } = require('../config/database');
const { SECRET_KEY } = require('../middleware/authMiddleware');

async function register(req, res) {
  try {
    const { name, email, password, role, phone, address, shop_name, upi_id, area_pincode } = req.body;

    if (!['customer', 'shopkeeper'].includes(role)) {
      return res.status(400).json({ detail: "Role must be 'customer' or 'shopkeeper'" });
    }

    const existing = await queryGet("SELECT id FROM users WHERE email = ?", [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ detail: "Email is already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const pwdHash = await bcrypt.hash(password, salt);

    const userResult = await queryRun(
      "INSERT INTO users (name, email, password_hash, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
      [name.trim(), email.toLowerCase().trim(), pwdHash, role, phone || null, address || null]
    );

    const userId = userResult.lastID;
    let shopId = null;

    if (role === 'shopkeeper') {
      const sName = shop_name ? shop_name.trim() : `${name.trim()}'s Kirana Store`;
      const upi = upi_id ? upi_id.trim() : `${phone || 'store'}@upi`;

      const shopResult = await queryRun(
        `INSERT INTO shops (user_id, shop_name, owner_name, address, area_pincode, phone, upi_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, sName, name.trim(), address || "Main Street", area_pincode || "560001", phone || "9999999999", upi]
      );
      shopId = shopResult.lastID;
    }

    const token = jwt.sign({ sub: String(userId), role }, SECRET_KEY, { expiresIn: '7d' });

    return res.status(201).json({
      message: "User registered successfully",
      access_token: token,
      token_type: "bearer",
      user: { id: userId, name, email, role, shop_id: shopId }
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await queryGet("SELECT * FROM users WHERE email = ?", [email.toLowerCase().trim()]);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ detail: "Invalid email or password" });
    }

    let shopId = null;
    if (user.role === 'shopkeeper') {
      const shop = await queryGet("SELECT id FROM shops WHERE user_id = ?", [user.id]);
      if (shop) shopId = shop.id;
    }

    const token = jwt.sign({ sub: String(user.id), role: user.role }, SECRET_KEY, { expiresIn: '7d' });

    return res.json({
      access_token: token,
      token_type: "bearer",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        shop_id: shopId
      }
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function getMe(req, res) {
  try {
    let shopInfo = null;
    if (req.user.role === 'shopkeeper') {
      shopInfo = await queryGet("SELECT * FROM shops WHERE user_id = ?", [req.user.id]);
    }
    const response = { ...req.user };
    if (shopInfo) response.shop = shopInfo;
    return res.json(response);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

module.exports = {
  register,
  login,
  getMe
};
