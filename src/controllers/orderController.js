const Order = require('../models/Order');
const emailService = require('../utils/emailService');
const { ORDER_STATUS } = require('../config/constants');

/**
 * @desc    Get all orders (Admin only)
 * @route   GET /api/orders/all
 * @access  Private/Admin
 */
const getAllOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    if (search) {
      filter.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
        { razorpayOrderId: { $regex: search, $options: 'i' } },
        { razorpayPaymentId: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-razorpaySignature -adminNotes -metadata -__v'),
      Order.countDocuments(filter)
    ]);

    // Calculate summary stats
    const summary = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.PENDING] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.DELIVERED] }, 1, 0] }
          }
        }
      }
    ]);

    const summaryData = summary[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      pendingOrders: 0,
      completedOrders: 0
    };

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      summary: summaryData,
      orders
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    next(error);
  }
};

/**
 * @desc    Get orders by user email
 * @route   GET /api/orders/user/:email
 * @access  Public
 */
const getUserOrders = async (req, res, next) => {
  try {
    const { email } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find({ 'customer.email': email })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-razorpaySignature -adminNotes -metadata -__v'),
      Order.countDocuments({ 'customer.email': email })
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      orders
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    next(error);
  }
};

/**
 * @desc    Get order by ID
 * @route   GET /api/orders/:orderId
 * @access  Public
 */
const getOrderById = async (req, res, next) => {
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
    console.error('Get order by ID error:', error);
    next(error);
  }
};

/**
 * @desc    Update order status (Admin only)
 * @route   PUT /api/orders/update-status/:orderId
 * @access  Private/Admin
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, notes, trackingNumber, carrier } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    order.status = status;
    order.updatedAt = Date.now();

    // Update shipping info if provided
    if (trackingNumber) {
      order.shipping.trackingNumber = trackingNumber;
    }

    if (carrier) {
      order.shipping.carrier = carrier;
    }

    if (status === ORDER_STATUS.SHIPPED) {
      order.shipping.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    }

    if (status === ORDER_STATUS.DELIVERED) {
      order.shipping.deliveredAt = new Date();
    }

    // Add admin note
    if (notes) {
      order.adminNotes.push({
        note: `Status updated to ${status}. ${notes}`,
        addedBy: req.user?.id || 'admin'
      });
    }

    await order.save();

    // Send email notification for status updates
    if (status === ORDER_STATUS.SHIPPED || status === ORDER_STATUS.DELIVERED) {
      emailService.sendShippingUpdate(
        order,
        status === ORDER_STATUS.SHIPPED ? 'shipped' : 'delivered'
      );
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        _id: order._id,
        status: order.status,
        shipping: order.shipping,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    next(error);
  }
};

/**
 * @desc    Get order statistics
 * @route   GET /api/orders/stats
 * @access  Private/Admin
 */
const getOrderStats = async (req, res, next) => {
  try {
    const { timeframe = 'month' } = req.query;

    let startDate;
    const endDate = new Date();

    switch (timeframe) {
      case 'day':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get order statistics
    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.DELIVERED] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.PENDING] }, 1, 0] }
          }
        }
      }
    ]);

    // Get daily revenue for the last 7 days
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          paymentStatus: 'success'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    const result = {
      timeframe,
      period: { startDate, endDate },
      summary: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        completedOrders: 0,
        pendingOrders: 0
      },
      dailyRevenue,
      topProducts
    };

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Get order stats error:', error);
    next(error);
  }
};

/**
 * @desc    Get recent orders
 * @route   GET /api/orders/recent
 * @access  Private/Admin
 */
const getRecentOrders = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('razorpayOrderId customer.name customer.email totalAmount status paymentStatus createdAt');

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });

  } catch (error) {
    console.error('Get recent orders error:', error);
    next(error);
  }
};

module.exports = {
  getAllOrders,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
  getRecentOrders
};