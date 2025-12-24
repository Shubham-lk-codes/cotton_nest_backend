const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  getPaymentStatus,
  refundPayment
} = require('../controllers/paymentController');
const {
  validateOrderCreation,
  validatePaymentVerification
} = require('../middleware/validation');
const { adminAuth, apiLimiter } = require('../middleware/auth');

// Apply rate limiting to all payment routes
router.use(apiLimiter);

// Public routes
router.post('/create-order', validateOrderCreation, createOrder);
router.post('/verify-payment', validatePaymentVerification, verifyPayment);
router.get('/payment-details/:orderId', getPaymentDetails);
router.get('/status/:razorpayOrderId', getPaymentStatus);

// Admin only routes
router.post('/refund/:paymentId', adminAuth, refundPayment);

module.exports = router;