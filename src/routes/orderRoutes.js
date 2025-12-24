// orderRoutes.js
const express = require('express');
const router = express.Router();
const { getAllOrders, getUserOrders, updateOrderStatus, getOrderById } = require('../controllers/orderController');

router.get('/all', getAllOrders);
router.get('/user/:email', getUserOrders);
router.put('/update-status/:orderId', updateOrderStatus);
router.get('/:orderId', getOrderById);

module.exports = router;