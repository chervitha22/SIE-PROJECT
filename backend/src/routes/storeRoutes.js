const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', storeController.listStores);
router.get('/my-shop/profile', verifyToken, requireRole(['shopkeeper']), storeController.getMyShopProfile);
router.put('/my-shop/profile', verifyToken, requireRole(['shopkeeper']), storeController.updateMyShopProfile);
router.get('/:shopId', storeController.getStore);

module.exports = router;
