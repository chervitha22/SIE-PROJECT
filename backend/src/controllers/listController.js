const { queryAll, queryGet, queryRun } = require('../config/database');

async function getUserLists(req, res) {
  try {
    const lists = await queryAll("SELECT * FROM monthly_lists WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
    const result = [];

    for (const l of lists) {
      const items = await queryAll("SELECT * FROM monthly_list_items WHERE list_id = ?", [l.id]);
      result.push({ ...l, items });
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function createMonthlyList(req, res) {
  try {
    const { title, description, items } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ detail: "List title is required" });
    }
    if (!items || !items.length) {
      return res.status(400).json({ detail: "At least one item is required in the monthly list" });
    }

    const listResult = await queryRun(
      "INSERT INTO monthly_lists (user_id, title, description) VALUES (?, ?, ?)",
      [req.user.id, title.trim(), description || null]
    );

    const listId = listResult.lastID;
    for (const item of items) {
      await queryRun(
        "INSERT INTO monthly_list_items (list_id, item_name, quantity, unit, notes) VALUES (?, ?, ?, ?, ?)",
        [listId, item.item_name.trim(), item.quantity, item.unit.trim(), item.notes || null]
      );
    }

    return res.status(201).json({ message: "Monthly grocery list created successfully", list_id: listId });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function getMonthlyList(req, res) {
  try {
    const { listId } = req.params;
    const list = await queryGet("SELECT * FROM monthly_lists WHERE id = ? AND user_id = ?", [listId, req.user.id]);
    if (!list) {
      return res.status(404).json({ detail: "Monthly list not found" });
    }

    const items = await queryAll("SELECT * FROM monthly_list_items WHERE list_id = ?", [listId]);
    return res.json({ ...list, items });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

async function deleteMonthlyList(req, res) {
  try {
    const { listId } = req.params;
    const list = await queryGet("SELECT id FROM monthly_lists WHERE id = ? AND user_id = ?", [listId, req.user.id]);
    if (!list) {
      return res.status(404).json({ detail: "Monthly list not found" });
    }

    await queryRun("DELETE FROM monthly_lists WHERE id = ?", [listId]);
    return res.json({ message: "Monthly list deleted successfully" });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

module.exports = {
  getUserLists,
  createMonthlyList,
  getMonthlyList,
  deleteMonthlyList
};
