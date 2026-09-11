const jwt = require('jsonwebtoken');
const { queryGet } = require('../config/database');

const SECRET_KEY = process.env.JWT_SECRET || "grocery_direct_secret_jwt_key_super_secure";

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = parseInt(decoded.sub);

    const user = await queryGet("SELECT id, name, email, role, phone, address FROM users WHERE id = ?", [userId]);
    if (!user) {
      return res.status(401).json({ detail: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ detail: "Invalid or expired token" });
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ detail: `Access denied. Requires role: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}

module.exports = {
  SECRET_KEY,
  verifyToken,
  requireRole
};
