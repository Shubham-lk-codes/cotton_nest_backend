const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');
const slugify = require('slugify');

// Helper function to generate SKU
const generateSKU = (name, color, size) => {
  const prefix = name.substring(0, 3).toUpperCase();
  const colorCode = color.substring(0, 2).toUpperCase();
  const sizeCode = size.toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${colorCode}-${sizeCode}-${random}`;
};

// @desc    Create new product
// @route   POST /api/admin/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      discount,
      category,
      subcategory,
      material,
      features,
      isFeatured,
      isNew,
      isActive = true
    } = req.body;

    // Parse arrays from request body
    const colors = Array.isArray(req.body.colors) ? req.body.colors : JSON.parse(req.body.colors || '[]');
    const sizes = Array.isArray(req.body.sizes) ? req.body.sizes : JSON.parse(req.body.sizes || '[]');
    const careInstructions = Array.isArray(req.body.careInstructions) 
      ? req.body.careInstructions 
      : JSON.parse(req.body.careInstructions || '[]');

    // Handle uploaded images
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        images.push({
          url: file.path,
          public_id: file.filename,
          alt: `${name} - Image ${index + 1}`,
          isPrimary: index === 0
        });
      });
    }

    // Generate SKU for each size-color combination
    const sizeDetails = sizes.map(sizeObj => {
      return colors.map(colorObj => {
        return {
          size: sizeObj.size,
          available: sizeObj.available !== false,
          stock: parseInt(sizeObj.stock) || 0,
          sku: generateSKU(name, colorObj.name, sizeObj.size)
        };
      });
    }).flat();

    // Calculate total stock
    const totalStock = sizeDetails.reduce((sum, item) => sum + item.stock, 0);

    // Create product
    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      discount: discount ? parseFloat(discount) : 0,
      category,
      subcategory: subcategory || undefined,
      colors: colors.map(color => ({
        name: color.name,
        hex: color.hex || '#000000',
        available: color.available !== false
      })),
      sizes: sizeDetails,
      images,
      material,
      careInstructions,
      features: features ? (Array.isArray(features) ? features : JSON.parse(features)) : [],
      isFeatured: isFeatured === 'true',
      isNew: isNew === 'true',
      isActive: isActive === 'true',
      stock: totalStock,
      metaTitle: name,
      metaDescription: description.substring(0, 160),
      keywords: name.split(' ').concat(category).concat(material ? material.split(' ') : [])
    });

    // Generate slug
    product.slug = slugify(name, { lower: true, strict: true });

    const createdProduct = await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: createdProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    // Delete uploaded images from Cloudinary if product creation fails
    if (req.files && req.files.length > 0) {
      await Promise.all(
        req.files.map(file => 
          cloudinary.uploader.destroy(file.filename)
        )
      );
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete old images if new ones are uploaded
    if (req.files && req.files.length > 0) {
      // Delete old images from Cloudinary
      await Promise.all(
        product.images.map(image => 
          cloudinary.uploader.destroy(image.public_id)
        )
      );
      
      // Add new images
      const newImages = req.files.map((file, index) => ({
        url: file.path,
        public_id: file.filename,
        alt: `${req.body.name || product.name} - Image ${index + 1}`,
        isPrimary: index === 0
      }));
      
      product.images = newImages;
    }

    // Update other fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'images') {
        if (key === 'colors' || key === 'sizes' || key === 'careInstructions' || key === 'features') {
          try {
            product[key] = JSON.parse(req.body[key]);
          } catch {
            product[key] = req.body[key];
          }
        } else if (key === 'price' || key === 'originalPrice' || key === 'discount') {
          product[key] = parseFloat(req.body[key]);
        } else if (key === 'isFeatured' || key === 'isNew' || key === 'isActive') {
          product[key] = req.body[key] === 'true';
        } else {
          product[key] = req.body[key];
        }
      }
    });

    // Update slug if name changed
    if (req.body.name && req.body.name !== product.name) {
      product.slug = slugify(req.body.name, { lower: true, strict: true });
    }

    // Update stock from sizes
    if (req.body.sizes) {
      const sizes = typeof req.body.sizes === 'string' 
        ? JSON.parse(req.body.sizes) 
        : req.body.sizes;
      
      product.stock = sizes.reduce((sum, size) => sum + (parseInt(size.stock) || 0), 0);
    }

    product.updatedAt = Date.now();
    
    const updatedProduct = await product.save();
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      await Promise.all(
        product.images.map(image => 
          cloudinary.uploader.destroy(image.public_id)
        )
      );
    }

    await product.deleteOne();
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

// @desc    Get all products (admin)
// @route   GET /api/admin/products
// @access  Private/Admin
exports.getAdminProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const search = req.query.search || '';
    const category = req.query.category || '';
    const status = req.query.status || '';
    
    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      } else if (status === 'featured') {
        query.isFeatured = true;
      } else if (status === 'new') {
        query.isNew = true;
      } else if (status === 'low-stock') {
        query.stock = { $lte: query.lowStockThreshold || 10 };
      } else if (status === 'out-of-stock') {
        query.stock = 0;
      }
    }
    
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Product.countDocuments(query);
    
    res.json({
      success: true,
      products,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// @desc    Get product by ID
// @route   GET /api/admin/products/:id
// @access  Private/Admin
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

// @desc    Upload product images
// @route   POST /api/admin/products/upload-images
// @access  Private/Admin
exports.uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }
    
    const uploadedImages = req.files.map(file => ({
      url: file.path,
      public_id: file.filename,
      alt: file.originalname
    }));
    
    res.json({
      success: true,
      images: uploadedImages
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
};