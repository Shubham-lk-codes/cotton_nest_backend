const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['tshirts', 'hoodies', 'sweatshirts', 'pants', 'accessories']
  },
  subcategory: String,
  
  // Images
  images: [{
    url: String,
    public_id: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Variants
  colors: [{
    name: String,
    hex: String,
    available: {
      type: Boolean,
      default: true
    }
  }],
  
  sizes: [{
    size: String,
    available: {
      type: Boolean,
      default: true
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    sku: String
  }],
  
  // Inventory
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  
  // Product Details
  material: String,
  careInstructions: [String],
  features: [String],
  
  // SEO
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  metaTitle: String,
  metaDescription: String,
  keywords: [String],
  
  // Ratings & Reviews
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    distribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isNew: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function() {
  if (this.discount > 0) {
    return this.price - (this.price * this.discount / 100);
  }
  return this.price;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock <= 0) return 'out-of-stock';
  if (this.stock <= this.lowStockThreshold) return 'low-stock';
  return 'in-stock';
});

// Pre-save middleware for slug
productSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Ensure arrays are initialized
  if (!this.colors) this.colors = [];
  if (!this.sizes) this.sizes = [];
  if (!this.images) this.images = [];
  if (!this.careInstructions) this.careInstructions = [];
  if (!this.features) this.features = [];
  if (!this.keywords) this.keywords = [];
  
  next();
});

// Indexes
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ ratings: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ 'sizes.sku': 1 }, { unique: true, sparse: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;