const Order = require('../models/Order');
const razorpayService = require('../utils/razorpay');
const emailService = require('../utils/emailService');
const { PAYMENT_STATUS, ORDER_STATUS } = require('../config/constants');

/**
 * @desc    Handle Razorpay webhook events
 * @route   POST /api/webhooks/razorpay
 * @access  Public (called by Razorpay)
 */
const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookBody = JSON.stringify(req.body);

    // Verify webhook signature
    const verification = razorpayService.verifyWebhookSignature(webhookBody, signature);

    if (!verification.isAuthentic) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`Received webhook event: ${event}`);

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;

      case 'order.paid':
        await handleOrderPaid(payload);
        break;

      case 'refund.created':
        await handleRefundCreated(payload);
        break;

      case 'refund.processed':
        await handleRefundProcessed(payload);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.status(200).send('Webhook received successfully');

  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).send('Internal server error');
  }
};

/**
 * Handle payment.captured event
 */
const handlePaymentCaptured = async (payload) => {
  try {
    const { payment } = payload;

    const order = await Order.findOne({ razorpayPaymentId: payment.entity.id });

    if (!order) {
      console.error(`Order not found for payment ID: ${payment.entity.id}`);
      return;
    }

    // Update order status
    order.paymentStatus = PAYMENT_STATUS.SUCCESS;
    order.status = ORDER_STATUS.CONFIRMED;
    order.updatedAt = Date.now();

    // Add admin note
    order.adminNotes.push({
      note: `Payment captured via webhook. Amount: ₹${payment.entity.amount / 100}`,
      addedBy: 'system'
    });

    await order.save();

    // Send payment success email
    emailService.sendPaymentSuccess(order);

    console.log(`Payment captured for order: ${order.razorpayOrderId}`);

  } catch (error) {
    console.error('Handle payment captured error:', error);
  }
};

/**
 * Handle payment.failed event
 */
const handlePaymentFailed = async (payload) => {
  try {
    const { payment } = payload;

    const order = await Order.findOne({ razorpayPaymentId: payment.entity.id });

    if (!order) {
      console.error(`Order not found for payment ID: ${payment.entity.id}`);
      return;
    }

    // Update order status
    order.paymentStatus = PAYMENT_STATUS.FAILED;
    order.status = ORDER_STATUS.FAILED;
    order.updatedAt = Date.now();

    // Add admin note
    order.adminNotes.push({
      note: `Payment failed via webhook. Error: ${payment.entity.error_description}`,
      addedBy: 'system'
    });

    await order.save();

    console.log(`Payment failed for order: ${order.razorpayOrderId}`);

  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
};

/**
 * Handle order.paid event
 */
const handleOrderPaid = async (payload) => {
  try {
    const { order } = payload;

    const dbOrder = await Order.findOne({ razorpayOrderId: order.entity.id });

    if (!dbOrder) {
      console.error(`Order not found in database: ${order.entity.id}`);
      return;
    }

    // Order is already paid, update status
    dbOrder.paymentStatus = PAYMENT_STATUS.SUCCESS;
    dbOrder.status = ORDER_STATUS.CONFIRMED;
    dbOrder.updatedAt = Date.now();

    await dbOrder.save();

    console.log(`Order marked as paid: ${order.entity.id}`);

  } catch (error) {
    console.error('Handle order paid error:', error);
  }
};

/**
 * Handle refund.created event
 */
const handleRefundCreated = async (payload) => {
  try {
    const { refund } = payload;

    const order = await Order.findOne({ razorpayPaymentId: refund.entity.payment_id });

    if (!order) {
      console.error(`Order not found for payment ID: ${refund.entity.payment_id}`);
      return;
    }

    // Update order status
    order.paymentStatus = PAYMENT_STATUS.REFUNDED;
    order.status = ORDER_STATUS.CANCELLED;
    order.updatedAt = Date.now();

    // Add admin note
    order.adminNotes.push({
      note: `Refund initiated via webhook. Refund ID: ${refund.entity.id}, Amount: ₹${refund.entity.amount / 100}`,
      addedBy: 'system'
    });

    await order.save();

    console.log(`Refund created for order: ${order.razorpayOrderId}`);

  } catch (error) {
    console.error('Handle refund created error:', error);
  }
};

/**
 * Handle refund.processed event
 */
const handleRefundProcessed = async (payload) => {
  try {
    const { refund } = payload;

    const order = await Order.findOne({ razorpayPaymentId: refund.entity.payment_id });

    if (!order) {
      console.error(`Order not found for payment ID: ${refund.entity.payment_id}`);
      return;
    }

    // Add admin note
    order.adminNotes.push({
      note: `Refund processed via webhook. Refund ID: ${refund.entity.id}, Amount: ₹${refund.entity.amount / 100}`,
      addedBy: 'system'
    });

    await order.save();

    console.log(`Refund processed for order: ${order.razorpayOrderId}`);

  } catch (error) {
    console.error('Handle refund processed error:', error);
  }
};

module.exports = {
  handleRazorpayWebhook
};