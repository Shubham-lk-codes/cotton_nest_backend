const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
  getRecentOrders
} = require('../controllers/orderController');
const { validateOrderStatusUpdate } = require('../middleware/validation');
const { adminAuth } = require('../middleware/auth');

/* =========================
   ADMIN ROUTES (FIRST)
========================= */

router.get('/all',  getAllOrders);
router.get('/stats', getOrderStats);
router.get('/recent', getRecentOrders);
router.put('/update-status/:orderId', validateOrderStatusUpdate, updateOrderStatus);

/* =========================
   PUBLIC ROUTES (LAST)
========================= */

router.get('/user/:email', getUserOrders);

// 🚨 ALWAYS KEEP THIS LAST
router.get('/:orderId', getOrderById);

module.exports = router;
