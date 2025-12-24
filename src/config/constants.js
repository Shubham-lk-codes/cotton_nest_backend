module.exports = {
  ORDER_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    CONFIRMED: 'confirmed',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    FAILED: 'failed'
  },
  
  PAYMENT_STATUS: {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },
  
  PAYMENT_METHOD: {
    RAZORPAY: 'razorpay',
    COD: 'cod'
  },
  
  CURRENCY: 'INR',
  
  SHIPPING_CHARGES: {
    FREE_THRESHOLD: 999,
    STANDARD: 99
  },
  
  TAX_RATE: 0.18, // 18% GST
  
  // Email templates
  EMAIL_TEMPLATES: {
    ORDER_CONFIRMATION: 'order_confirmation',
    PAYMENT_SUCCESS: 'payment_success',
    SHIPPING_UPDATE: 'shipping_update',
    ORDER_DELIVERED: 'order_delivered'
  }
};