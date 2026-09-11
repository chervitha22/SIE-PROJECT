const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { initDb, queryGet, queryRun } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const storeRoutes = require('./routes/storeRoutes');
const listRoutes = require('./routes/listRoutes');
const orderRoutes = require('./routes/orderRoutes');

initDb();

const app = express();
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/orders', orderRoutes);

// Seed Demo Data Function
async function seedDemoData() {
  try {
    const existing = await queryGet("SELECT id FROM users WHERE email = 'shop1@kirana.com'");
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const pwdHash = await bcrypt.hash('password123', salt);

      // 1. Shopkeeper 1
      const res1 = await queryRun(
        "INSERT INTO users (name, email, password_hash, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
        ["Ramesh Sharma", "shop1@kirana.com", pwdHash, "shopkeeper", "9876543210", "12 Market Road, Indiranagar"]
      );
      await queryRun(
        `INSERT INTO shops (user_id, shop_name, owner_name, address, area_pincode, phone, upi_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [res1.lastID, "Sharma General Kirana Store", "Ramesh Sharma", "12 Market Road, Indiranagar", "560038", "9876543210", "sharmakirana@upi"]
      );

      // 2. Shopkeeper 2
      const res2 = await queryRun(
        "INSERT INTO users (name, email, password_hash, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
        ["Anita Gupta", "shop2@kirana.com", pwdHash, "shopkeeper", "9812345678", "45 Station Avenue, Koramangala"]
      );
      await queryRun(
        `INSERT INTO shops (user_id, shop_name, owner_name, address, area_pincode, phone, upi_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [res2.lastID, "Gupta Fresh & Monthly Provisions", "Anita Gupta", "45 Station Avenue, Koramangala", "560034", "9812345678", "guptafresh@okaxis"]
      );

      // 3. Demo Customer
      const resCust = await queryRun(
        "INSERT INTO users (name, email, password_hash, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
        ["Priya Verma", "customer@gmail.com", pwdHash, "customer", "9988776655", "Flat 302, Green Valley Apartments, Indiranagar"]
      );

      // 4. Demo Monthly List
      const resList = await queryRun(
        "INSERT INTO monthly_lists (user_id, title, description) VALUES (?, ?, ?)",
        [resCust.lastID, "Standard Monthly Ration (Indiranagar)", "Essential monthly staples for 4 family members"]
      );

      const items = [
        ["Aashirvaad Whole Wheat Atta", 10, "kg", "Prefer 10kg sealed bag"],
        ["Fortune Sunlite Sunflower Oil", 5, "L", "5L Can"],
        ["Basmati Rice (India Gate)", 5, "kg", "Long grain"],
        ["Toor Dal (Premium Quality)", 2, "kg", "Unpolished"],
        ["Tata Salt", 2, "packet", "1kg packets"],
        ["Surf Excel Easy Wash Powder", 3, "kg", "3kg pack"],
        ["Amul Taaza Milk T-Special", 30, "L", "Daily 1L delivery or total"]
      ];

      for (const [name, qty, unit, note] of items) {
        await queryRun(
          "INSERT INTO monthly_list_items (list_id, item_name, quantity, unit, notes) VALUES (?, ?, ?, ?, ?)",
          [resList.lastID, name, qty, unit, note]
        );
      }
      console.log("Demo data seeded for Node.js Express backend!");
    }
  } catch (err) {
    console.error("Error seeding demo data:", err);
  }
}

seedDemoData();

// Serve static frontend files
const staticPath = path.join(__dirname, '../../static');
app.use(express.static(staticPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Node.js Express Backend running at http://localhost:${PORT}`);
});
