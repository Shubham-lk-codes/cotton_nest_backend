// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');

// Example routes - adjust according to your needs
router.get('/', protect, admin, (req, res) => {
  res.json({ message: 'User management endpoint' });
});

module.exports = router;