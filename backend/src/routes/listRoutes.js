const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole(['customer']));

router.get('/', listController.getUserLists);
router.post('/', listController.createMonthlyList);
router.get('/:listId', listController.getMonthlyList);
router.delete('/:listId', listController.deleteMonthlyList);

module.exports = router;
