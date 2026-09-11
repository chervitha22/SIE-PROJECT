const { queryAll, queryGet, queryRun } = require('../config/database');

async function listStores(req, res) {
  try {
    const { pincode } = req.query;
    let sql = "SELECT * FROM shops WHERE is_active = 1";
    const params = [];
    if (pincode) {
      sql += " AND area_pincode = ?";
      params.push(pincode);
    }
    sql += " ORDER BY shop_name ASC";
    const shops = await queryAll(sql, params);
    return res.json(shops);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function getStore(req, res) {
  try {
    const { shopId } = req.params;
    const shop = await queryGet("SELECT * FROM shops WHERE id = ?", [shopId]);
    if (!shop) {
      return res.status(404).json({ detail: "Store not found" });
    }
    return res.json(shop);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function getMyShopProfile(req, res) {
  try {
    const shop = await queryGet("SELECT * FROM shops WHERE user_id = ?", [req.user.id]);
    if (!shop) {
      return res.status(404).json({ detail: "Shop profile not found" });
    }
    return res.json(shop);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function updateMyShopProfile(req, res) {
  try {
    const { shop_name, owner_name, address, area_pincode, phone, upi_id } = req.body;
    const existing = await queryGet("SELECT id FROM shops WHERE user_id = ?", [req.user.id]);

    if (existing) {
      await queryRun(
        `UPDATE shops SET shop_name=?, owner_name=?, address=?, area_pincode=?, phone=?, upi_id=?
         WHERE id=?`,
        [shop_name, owner_name, address, area_pincode, phone, upi_id, existing.id]
      );
    } else {
      await queryRun(
        `INSERT INTO shops (user_id, shop_name, owner_name, address, area_pincode, phone, upi_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, shop_name, owner_name, address, area_pincode, phone, upi_id]
      );
    }

    const updated = await queryGet("SELECT * FROM shops WHERE user_id = ?", [req.user.id]);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

module.exports = {
  listStores,
  getStore,
  getMyShopProfile,
  updateMyShopProfile
};
