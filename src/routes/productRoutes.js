// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const productController = require('../controllers/productController');
const { protect, admin } = require('../middleware/auth');

// Configure multer with Cloudinary storage
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Public routes
// router.get('/stats', productController.getProductStats);
// router.get('/:id', productController.getProductById);

router.get('/', productController.getProducts); // Add this for public access
router.get('/stats', productController.getProductStats);
router.get('/:id', productController.getProductById);


// Protected admin routes
router.route('/')
  .get( productController.getAdminProducts)
  .post(
   
    upload.array('images', 10), 
    handleMulterError,
    productController.createProduct
  );

router.route('/:id')
  .put(
   
    upload.array('images', 10), 
    handleMulterError,
    productController.updateProduct
  )
  .delete(productController.deleteProduct);

  router.delete('/:id/images', productController.deleteProductImage);

module.exports = router;