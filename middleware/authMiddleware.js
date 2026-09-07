const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'edupulse-jwt-secret-key-2026';
const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

/**
 * Protect routes - Verifies JWT Bearer token and approved status
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let currentUser = null;

    if (isDbConnected()) {
      currentUser = await User.findById(decoded.id).select('-password');
    }

    if (!currentUser) {
      // In-memory fallback lookup
      const { memoryUsers } = require('../controllers/authController');
      const memoryUser = memoryUsers.find((u) => u._id === decoded.id || u.email === decoded.id);
      if (memoryUser) {
        currentUser = {
          _id: memoryUser._id,
          name: memoryUser.name,
          email: memoryUser.email,
          role: memoryUser.role,
          approval_status: memoryUser.approval_status || 'approved'
        };
      }
    }

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists'
      });
    }

    const status = currentUser.approval_status || 'approved';
    if (status === 'pending') {
      return res.status(403).json({
        success: false,
        pending: true,
        message: 'Your account is pending Admin approval.'
      });
    }
    if (status === 'rejected') {
      return res.status(403).json({
        success: false,
        rejected: true,
        message: 'Your registration request has been rejected.'
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    console.error('JWT Token Verification Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, invalid or expired token'
    });
  }
};

/**
 * Role Authorization Middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};

/**
 * Authorization Middleware for Admin Operations
 * Supports both JWT Admin role and admin secret key
 */
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET_KEY || 'admin-secret-token';

  // 1. Check direct admin key
  if (adminKey === expectedKey || authHeader === `Bearer ${expectedKey}`) {
    return next();
  }

  // 2. Check JWT token if provided
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return protect(req, res, () => {
      if (req.user && req.user.role === 'admin') {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin authorization required'
      });
    });
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden: Admin authorization required to perform this action'
  });
};

module.exports = {
  protect,
  authorize,
  requireAdmin
};
