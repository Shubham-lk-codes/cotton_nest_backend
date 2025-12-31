// routes/adminAuthRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
// routes/adminAuthRoutes.js - UPDATED with debugging
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔍 Login attempt for email:', email);
    console.log('📦 Request body received:', { email, password: password ? '***' : 'missing' });

    // Validation
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email (include password field)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    
    console.log('👤 User found:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('❌ No user found with email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('📝 User details:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('⛔ User is not admin. Role:', user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('⛔ User account is inactive');
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password - IMPORTANT: Add direct bcrypt comparison as fallback
    console.log('🔐 Checking password...');
    
    let isPasswordValid = false;
    
    // Try the instance method first
    if (user.comparePassword) {
      console.log('🔑 Using comparePassword method');
      isPasswordValid = await user.comparePassword(password);
    } else {
      console.log('⚠️ comparePassword method not available, using direct bcrypt');
      // Direct bcrypt comparison as fallback
      isPasswordValid = await bcrypt.compare(password, user.password);
    }
    
    console.log('✅ Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Password comparison failed');
      
      // Log for debugging - NEVER do this in production
      console.log('DEBUG - Stored password hash (first 20 chars):', user.password ? user.password.substring(0, 20) + '...' : 'null');
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('🎉 Login successful for user:', user.email);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role, 
        name: user.name 
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_this',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('💥 Login error details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message // Remove this in production
    });
  }
});

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin user
 * @access  Private/Admin
 */
router.get('/me', protect, admin, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Logout admin
 * @access  Private/Admin
 */
router.post('/logout', protect, admin, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;