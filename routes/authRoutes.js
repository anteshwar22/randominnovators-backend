const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  getAllUsers,
  approveUser,
  rejectUser,
  getApprovalConfig,
  updateApprovalConfig,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

// Public Auth Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/config', getApprovalConfig);

// Protected Auth Profile Route
router.get('/me', protect, getMe);

// Admin Approval & Management Routes
router.put('/config', requireAdmin, updateApprovalConfig);
router.get('/users', requireAdmin, getAllUsers);
router.put('/users/:id/approve', requireAdmin, approveUser);
router.put('/users/:id/reject', requireAdmin, rejectUser);

module.exports = router;
