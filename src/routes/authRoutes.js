const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email (include password field)
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

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
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

/**
 * @route   POST /api/admin/auth/register
 * @desc    Register admin user (first time setup only)
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create admin user
    const user = await User.create({
      name,
      email,
      password,
      role: 'admin'
    });

    // Generate token
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

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin user
 * @access  Private/Admin
 */
router.get('/me', (req, res) => {
  try {
    // This route should be protected by auth middleware
    // For now, we'll handle it differently
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_this');
    
    res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

module.exports = router;