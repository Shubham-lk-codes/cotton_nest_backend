const jwt = require('jsonwebtoken');
const rateLimiter = require('express-rate-limit');

/**
 * Generic authentication middleware - checks if user is authenticated
 */
const protect = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    let token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_this');
    
    // Add user to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Admin authorization middleware - checks if user is admin
 */
const admin = (req, res, next) => {
  try {
    // Check if user exists (should be added by protect middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authorization'
    });
  }
};

/**
 * Combined protect + admin middleware (single middleware)
 */
const adminAuth = (req, res, next) => {
  protect(req, res, () => {
    admin(req, res, next);
  });
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_this');
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    console.warn('Optional auth warning:', error.message);
    next();
  }
};

/**
 * Check if user is logged in
 */
const isLoggedIn = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Please login to access this resource'
    });
  }
  next();
};

/**
 * Role-based authorization middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Rate limiting middleware
 */
const apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Admin-specific rate limiter
 */
const adminLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // stricter limit for admin endpoints
  message: {
    success: false,
    message: 'Too many admin requests. Please try again later.'
  }
});

/**
 * CORS configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://thecottonnest.com',
      'https://www.thecottonnest.com'
    ];

    // Add FRONTEND_URL from environment if it exists
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = {
  protect,
  admin,
  adminAuth,
  optionalAuth,
  isLoggedIn,
  authorize,
  apiLimiter,
  adminLimiter,
  corsOptions
};