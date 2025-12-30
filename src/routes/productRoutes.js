const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const productController = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

// Configure multer with Cloudinary storage
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
    }
  }
});

// Admin routes
router.route('/')
  .get(protect, admin, productController.getAdminProducts)
  .post(protect, admin, upload.array('images', 10), productController.createProduct);

router.route('/upload-images')
  .post(protect, admin, upload.array('images', 10), productController.uploadImages);

router.route('/:id')
  .get(protect, admin, productController.getProductById)
  .put(protect, admin, upload.array('images', 10), productController.updateProduct)
  .delete(protect, admin, productController.deleteProduct);

module.exports = router;