const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.post('/', verifyToken, requireRole(['customer']), orderController.createOrder);
router.get('/', verifyToken, orderController.getOrders);
router.get('/:orderId', verifyToken, orderController.getOrderDetails);
router.put('/:orderId/price', verifyToken, requireRole(['shopkeeper']), orderController.setOrderPricing);
router.post('/:orderId/pay', verifyToken, requireRole(['customer']), orderController.submitPayment);
router.put('/:orderId/status', verifyToken, orderController.updateOrderStatus);

module.exports = router;
