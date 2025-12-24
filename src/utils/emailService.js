const nodemailer = require('nodemailer');
const { EMAIL_TEMPLATES } = require('../config/constants');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Send order confirmation email
   * @param {Object} order - Order details
   * @returns {Promise<Object>} Email send result
   */
  async sendOrderConfirmation(order) {
    try {
      const mailOptions = {
        from: `"The Cotton Nest" <${process.env.EMAIL_FROM}>`,
        to: order.customer.email,
        subject: `Order Confirmation #${order.orderNumber}`,
        html: this.generateOrderConfirmationEmail(order)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Order confirmation email sent successfully'
      };
    } catch (error) {
      console.error('Send order confirmation email error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send order confirmation email'
      };
    }
  }

  /**
   * Send payment success email
   * @param {Object} order - Order details
   * @returns {Promise<Object>} Email send result
   */
  async sendPaymentSuccess(order) {
    try {
      const mailOptions = {
        from: `"The Cotton Nest" <${process.env.EMAIL_FROM}>`,
        to: order.customer.email,
        subject: `Payment Successful for Order #${order.orderNumber}`,
        html: this.generatePaymentSuccessEmail(order)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Payment success email sent successfully'
      };
    } catch (error) {
      console.error('Send payment success email error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send payment success email'
      };
    }
  }

  /**
   * Generate order confirmation email HTML
   * @param {Object} order - Order details
   * @returns {string} HTML content
   */
  generateOrderConfirmationEmail(order) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .order-details { background: white; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Order!</h1>
            <p>Order #${order.orderNumber}</p>
          </div>
          
          <div class="content">
            <p>Dear ${order.customer.name},</p>
            <p>We have received your order and it is being processed.</p>
            
            <div class="order-details">
              <h3>Order Summary</h3>
              <p><strong>Order ID:</strong> ${order.razorpayOrderId}</p>
              <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
              <p><strong>Status:</strong> ${order.status}</p>
              
              <h4>Items Ordered:</h4>
              ${order.items.map(item => `
                <div>
                  <p>${item.name} (${item.color}, ${item.size}) × ${item.quantity} = ₹${item.subtotal}</p>
                </div>
              `).join('')}
              
              <h4>Shipping Address:</h4>
              <p>
                ${order.customer.address.street}<br>
                ${order.customer.address.city}, ${order.customer.address.state}<br>
                ${order.customer.address.country} - ${order.customer.address.pincode}
              </p>
            </div>
            
            <p>You can track your order using the link below:</p>
            <a href="${process.env.FRONTEND_URL}/orders/${order._id}" class="button">Track Order</a>
            
            <p>If you have any questions, please contact our support team.</p>
          </div>
          
          <div class="footer">
            <p>The Cotton Nest<br>
            Premium Cotton Clothing</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate payment success email HTML
   * @param {Object} order - Order details
   * @returns {string} HTML content
   */
  generatePaymentSuccessEmail(order) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .payment-details { background: white; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Successful! 🎉</h1>
            <p>Your payment for Order #${order.orderNumber} has been received</p>
          </div>
          
          <div class="content">
            <p>Dear ${order.customer.name},</p>
            <p>We have successfully received your payment of <strong>₹${order.totalAmount}</strong>.</p>
            
            <div class="payment-details">
              <h3>Payment Details</h3>
              <p><strong>Payment ID:</strong> ${order.razorpayPaymentId}</p>
              <p><strong>Order ID:</strong> ${order.razorpayOrderId}</p>
              <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Amount Paid:</strong> ₹${order.totalAmount}</p>
              <p><strong>Payment Status:</strong> <span style="color: #10B981;">Completed</span></p>
            </div>
            
            <p>Your order is now being processed and will be shipped soon.</p>
            <p>You will receive another email with shipping details once your order is dispatched.</p>
            
            <p>Thank you for shopping with us!</p>
          </div>
          
          <div class="footer">
            <p>The Cotton Nest<br>
            Premium Cotton Clothing</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send shipping update email
   * @param {Object} order - Order details
   * @param {string} updateType - Type of update
   * @returns {Promise<Object>} Email send result
   */
  async sendShippingUpdate(order, updateType) {
    try {
      const subjects = {
        shipped: `Your Order #${order.orderNumber} Has Been Shipped!`,
        delivered: `Your Order #${order.orderNumber} Has Been Delivered!`
      };

      const mailOptions = {
        from: `"The Cotton Nest" <${process.env.EMAIL_FROM}>`,
        to: order.customer.email,
        subject: subjects[updateType] || 'Shipping Update',
        html: this.generateShippingUpdateEmail(order, updateType)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Shipping update email sent successfully'
      };
    } catch (error) {
      console.error('Send shipping update email error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send shipping update email'
      };
    }
  }

  /**
   * Generate shipping update email HTML
   * @param {Object} order - Order details
   * @param {string} updateType - Type of update
   * @returns {string} HTML content
   */
  generateShippingUpdateEmail(order, updateType) {
    const templates = {
      shipped: `
        <h2>Your Order is On the Way! 🚚</h2>
        <p>Your order #${order.orderNumber} has been shipped.</p>
        ${order.shipping.trackingNumber ? `
          <p><strong>Tracking Number:</strong> ${order.shipping.trackingNumber}</p>
          <p><strong>Carrier:</strong> ${order.shipping.carrier}</p>
          <p><strong>Estimated Delivery:</strong> ${new Date(order.shipping.estimatedDelivery).toLocaleDateString()}</p>
        ` : ''}
      `,
      delivered: `
        <h2>Your Order Has Been Delivered! 📦</h2>
        <p>Your order #${order.orderNumber} has been successfully delivered.</p>
        ${order.shipping.deliveredAt ? `
          <p><strong>Delivered At:</strong> ${new Date(order.shipping.deliveredAt).toLocaleDateString()}</p>
        ` : ''}
      `
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Shipping Update</h1>
          </div>
          
          <div class="content">
            <p>Dear ${order.customer.name},</p>
            ${templates[updateType] || '<p>Your order status has been updated.</p>'}
            
            <p>Thank you for shopping with us!</p>
          </div>
          
          <div class="footer">
            <p>The Cotton Nest<br>
            Premium Cotton Clothing</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();