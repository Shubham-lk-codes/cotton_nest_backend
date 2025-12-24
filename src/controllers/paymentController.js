const Order = require('../models/Order');
const Product = require('../models/Product');
const razorpayService = require('../utils/razorpay');
const emailService = require('../utils/emailService');
const { ORDER_STATUS, PAYMENT_STATUS, SHIPPING_CHARGES, TAX_RATE } = require('../config/constants');

/**
 * @desc    Create Razorpay order
 * @route   POST /api/payment/create-order
 * @access  Public
 */
const createOrder = async (req, res, next) => {
  try {
    const { amount, items, userDetails } = req.body;

    // Calculate shipping charges
    const shippingCharges = amount >= SHIPPING_CHARGES.FREE_THRESHOLD 
      ? 0 
      : SHIPPING_CHARGES.STANDARD;

    // Calculate tax amount (18% GST)
    const taxAmount = Math.round(amount * TAX_RATE);

    // Calculate total amount
    const totalAmount = amount + shippingCharges + taxAmount;

    // Create Razorpay order
    const razorpayOrder = await razorpayService.createOrder({
      amount: totalAmount,
      currency: 'INR',
      notes: {
        customerName: userDetails.name,
        customerEmail: userDetails.email,
        itemsCount: items.length
      }
    });

    if (!razorpayOrder.success) {
      return res.status(400).json({
        success: false,
        message: razorpayOrder.message
      });
    }

    // Create order in database
    const order = new Order({
      razorpayOrderId: razorpayOrder.order.id,
      customer: {
        name: userDetails.name,
        email: userDetails.email,
        phone: userDetails.phone,
        address: userDetails.address
      },
      items: items.map(item => ({
        ...item,
        subtotal: item.price * item.quantity
      })),
      subtotal: amount,
      shippingCharges,
      taxAmount,
      totalAmount,
      status: ORDER_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      metadata: {
        browser: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    // Save order to database
    await order.save();

    // Update product stock (in real scenario, you'd want to handle this carefully)
    // await updateProductStock(items);

    // Send order confirmation email (in background)
    emailService.sendOrderConfirmation(order);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: razorpayOrder.order.id,
        amount: razorpayOrder.order.amount,
        currency: razorpayOrder.order.currency,
        receipt: razorpayOrder.order.receipt,
        createdAt: razorpayOrder.order.created_at
      },
      orderId: order._id,
      totalAmount
    });

  } catch (error) {
    console.error('Create order error:', error);
    next(error);
  }
};

/**
 * @desc    Verify Razorpay payment
 * @route   POST /api/payment/verify-payment
 * @access  Public
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify payment signature
    const verification = razorpayService.verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!verification.isAuthentic) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Find order in database
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if payment is already verified
    if (order.paymentStatus === PAYMENT_STATUS.SUCCESS) {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        orderId: order._id,
        paymentId: order.razorpayPaymentId
      });
    }

    // Fetch payment details from Razorpay
    const paymentDetails = await razorpayService.fetchPayment(razorpay_payment_id);

    if (!paymentDetails.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch payment details'
      });
    }

    // Update order with payment details
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paymentStatus = PAYMENT_STATUS.SUCCESS;
    order.status = ORDER_STATUS.CONFIRMED;
    order.updatedAt = Date.now();

    // Add admin note
    order.adminNotes.push({
      note: `Payment verified successfully. Payment ID: ${razorpay_payment_id}`,
      addedBy: 'system'
    });

    await order.save();

    // Send payment success email
    emailService.sendPaymentSuccess(order);

    // Here you would typically:
    // 1. Update inventory
    // 2. Generate invoice
    // 3. Trigger shipping process

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      orderId: order._id,
      paymentId: razorpay_payment_id,
      orderNumber: order.orderNumber
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    next(error);
  }
};

/**
 * @desc    Get payment details by order ID
 * @route   GET /api/payment/payment-details/:orderId
 * @access  Public
 */
const getPaymentDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .select('-razorpaySignature -adminNotes -metadata -__v');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Get payment details error:', error);
    next(error);
  }
};

/**
 * @desc    Get payment status
 * @route   GET /api/payment/status/:razorpayOrderId
 * @access  Public
 */
const getPaymentStatus = async (req, res, next) => {
  try {
    const { razorpayOrderId } = req.params;

    const order = await Order.findOne({ razorpayOrderId })
      .select('paymentStatus status razorpayPaymentId totalAmount');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // If payment is successful, check with Razorpay for latest status
    if (order.paymentStatus === PAYMENT_STATUS.SUCCESS && order.razorpayPaymentId) {
      try {
        const status = await razorpayService.checkPaymentStatus(order.razorpayPaymentId);
        order.paymentStatus = status === 'captured' ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.FAILED;
      } catch (error) {
        console.error('Error checking payment status with Razorpay:', error);
      }
    }

    res.status(200).json({
      success: true,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      paymentId: order.razorpayPaymentId,
      amount: order.totalAmount
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    next(error);
  }
};

/**
 * @desc    Refund payment
 * @route   POST /api/payment/refund/:paymentId
 * @access  Private/Admin
 */
const refundPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    // Find order by payment ID
    const order = await Order.findOne({ razorpayPaymentId: paymentId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this payment'
      });
    }

    // Check if payment can be refunded
    if (order.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({
        success: false,
        message: 'Payment must be successful to initiate refund'
      });
    }

    const refundAmount = amount || order.totalAmount;

    // Create refund through Razorpay
    const refund = await razorpayService.createRefund(
      paymentId,
      refundAmount,
      { reason: reason || 'Customer request' }
    );

    if (!refund.success) {
      return res.status(400).json({
        success: false,
        message: refund.message
      });
    }

    // Update order status
    order.paymentStatus = PAYMENT_STATUS.REFUNDED;
    order.status = ORDER_STATUS.CANCELLED;
    order.updatedAt = Date.now();

    // Add admin note
    order.adminNotes.push({
      note: `Refund initiated. Refund ID: ${refund.refund.id}, Amount: ₹${refundAmount}, Reason: ${reason || 'Not specified'}`,
      addedBy: req.user?.id || 'admin'
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      refundId: refund.refund.id,
      amount: refundAmount,
      orderId: order._id
    });

  } catch (error) {
    console.error('Refund payment error:', error);
    next(error);
  }
};

/**
 * Helper function to update product stock
 */
const updateProductStock = async (items) => {
  for (const item of items) {
    if (item.productId) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
    }
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  getPaymentStatus,
  refundPayment
};