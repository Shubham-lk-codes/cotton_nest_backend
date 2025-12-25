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
const { adminAuth, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/user/:email', getUserOrders);
router.get('/:orderId', getOrderById);

// Admin only routes
router.get('/all', adminAuth, getAllOrders);
router.put('/update-status/:orderId', adminAuth, validateOrderStatusUpdate, updateOrderStatus);
router.get('/stats', adminAuth, getOrderStats);
router.get('/recent', adminAuth, getRecentOrders);

module.exports = router;