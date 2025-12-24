const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
  constructor() {
    this.instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  /**
   * Create a new Razorpay order
   * @param {Object} orderData - Order details
   * @returns {Promise<Object>} Razorpay order response
   */
  async createOrder(orderData) {
    try {
      const options = {
        amount: Math.round(orderData.amount * 100), // Convert to paise
        currency: orderData.currency || 'INR',
        receipt: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        notes: orderData.notes || {},
        payment_capture: 1 // Auto capture payment
      };

      const order = await this.instance.orders.create(options);
      
      return {
        success: true,
        order,
        message: 'Order created successfully'
      };
    } catch (error) {
      console.error('Razorpay createOrder error:', error);
      throw new Error(`Failed to create Razorpay order: ${error.message}`);
    }
  }

  /**
   * Fetch Razorpay order details
   * @param {string} orderId - Razorpay order ID
   * @returns {Promise<Object>} Order details
   */
  async fetchOrder(orderId) {
    try {
      const order = await this.instance.orders.fetch(orderId);
      return {
        success: true,
        order,
        message: 'Order fetched successfully'
      };
    } catch (error) {
      console.error('Razorpay fetchOrder error:', error);
      throw new Error(`Failed to fetch Razorpay order: ${error.message}`);
    }
  }

  /**
   * Fetch Razorpay payment details
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Payment details
   */
  async fetchPayment(paymentId) {
    try {
      const payment = await this.instance.payments.fetch(paymentId);
      return {
        success: true,
        payment,
        message: 'Payment fetched successfully'
      };
    } catch (error) {
      console.error('Razorpay fetchPayment error:', error);
      throw new Error(`Failed to fetch Razorpay payment: ${error.message}`);
    }
  }

  /**
   * Verify payment signature
   * @param {string} razorpayOrderId - Razorpay order ID
   * @param {string} razorpayPaymentId - Razorpay payment ID
   * @param {string} razorpaySignature - Razorpay signature
   * @returns {boolean} Verification result
   */
  verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      const body = razorpayOrderId + "|" + razorpayPaymentId;
      
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      const isAuthentic = expectedSignature === razorpaySignature;
      
      return {
        success: isAuthentic,
        isAuthentic,
        message: isAuthentic ? 'Payment signature verified' : 'Invalid payment signature'
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        isAuthentic: false,
        message: `Verification failed: ${error.message}`
      };
    }
  }

  /**
   * Verify webhook signature
   * @param {string} body - Request body as string
   * @param {string} signature - Webhook signature from header
   * @returns {boolean} Verification result
   */
  verifyWebhookSignature(body, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      const isAuthentic = expectedSignature === signature;
      
      return {
        success: isAuthentic,
        isAuthentic,
        message: isAuthentic ? 'Webhook signature verified' : 'Invalid webhook signature'
      };
    } catch (error) {
      console.error('Webhook verification error:', error);
      return {
        success: false,
        isAuthentic: false,
        message: `Webhook verification failed: ${error.message}`
      };
    }
  }

  /**
   * Refund a payment
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} amount - Amount to refund (in paise)
   * @param {string} notes - Refund notes
   * @returns {Promise<Object>} Refund details
   */
  async createRefund(paymentId, amount, notes = {}) {
    try {
      const refund = await this.instance.payments.refund(paymentId, {
        amount: Math.round(amount * 100),
        notes
      });

      return {
        success: true,
        refund,
        message: 'Refund initiated successfully'
      };
    } catch (error) {
      console.error('Razorpay refund error:', error);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Check payment status
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<string>} Payment status
   */
  async checkPaymentStatus(paymentId) {
    try {
      const payment = await this.instance.payments.fetch(paymentId);
      return payment.status;
    } catch (error) {
      console.error('Check payment status error:', error);
      throw new Error(`Failed to check payment status: ${error.message}`);
    }
  }
}

module.exports = new RazorpayService();