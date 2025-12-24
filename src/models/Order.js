const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } = require('../config/constants');

const orderSchema = new mongoose.Schema({
  // Razorpay Details
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true
  },
  razorpaySignature: {
    type: String,
    sparse: true
  },
  
  // Customer Details
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      sparse: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      street: {
        type: String,
        required: true,
        trim: true
      },
      city: {
        type: String,
        required: true,
        trim: true
      },
      state: {
        type: String,
        required: true,
        trim: true
      },
      country: {
        type: String,
        default: 'India',
        trim: true
      },
      pincode: {
        type: String,
        required: true,
        trim: true
      },
      landmark: String
    }
  },
  
  // Order Items
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String,
      required: true
    },
    color: {
      type: String,
      required: true
    },
    size: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    image: String,
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  
  // Pricing Details
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shippingCharges: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  taxAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment Details
  currency: {
    type: String,
    default: 'INR'
  },
  paymentMethod: {
    type: String,
    enum: Object.values(PAYMENT_METHOD),
    default: PAYMENT_METHOD.RAZORPAY
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },
  
  // Order Status
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING
  },
  
  // Shipping Details
  shipping: {
    carrier: String,
    trackingNumber: String,
    estimatedDelivery: Date,
    deliveredAt: Date,
    notes: String
  },
  
  // Admin Notes
  adminNotes: [{
    note: String,
    addedBy: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Metadata
  metadata: {
    browser: String,
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for readable order ID
orderSchema.virtual('orderNumber').get(function() {
  return `ORD${this._id.toString().slice(-8).toUpperCase()}`;
});

// Virtual for item count
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Pre-save middleware
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-calculate if not set
  if (this.isModified('items') || this.isModified('subtotal')) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  
  if (this.isModified('subtotal') || this.isModified('shippingCharges') || this.isModified('taxAmount') || this.isModified('discountAmount')) {
    this.totalAmount = this.subtotal + this.shippingCharges + this.taxAmount - this.discountAmount;
  }
  
  next();
});

// Indexes for better query performance
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ razorpayPaymentId: 1 }, { sparse: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;