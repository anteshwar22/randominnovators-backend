const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const { ALLOWED_ROLES, ALLOWED_STATUSES } = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'edupulse-jwt-secret-key-2026';

// In-memory fallback config & users for offline mode
const memoryConfig = { approval_mode: 'manual' };

const memoryUsers = [
  {
    _id: 'usr_admin_1',
    name: 'EduPulse Admin',
    email: 'admin@edupulse.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    approval_status: 'approved',
    approved_at: new Date(),
    approved_by: 'system',
    rejection_reason: '',
    createdAt: new Date()
  },
  {
    _id: 'usr_employee_2',
    name: 'Prof. Mayur Raut',
    email: 'teacher@edupulse.com',
    password: bcrypt.hashSync('teacher123', 10),
    role: 'employee',
    approval_status: 'approved',
    approved_at: new Date(),
    approved_by: 'system',
    rejection_reason: '',
    createdAt: new Date()
  },
  {
    _id: 'usr_employee_1',
    name: 'Alex Employee',
    email: 'employee@edupulse.com',
    password: bcrypt.hashSync('employee123', 10),
    role: 'employee',
    approval_status: 'approved',
    approved_at: new Date(),
    approved_by: 'system',
    rejection_reason: '',
    createdAt: new Date()
  }
];

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

// Helper: fetch approval mode from DB or memory fallback
const fetchCurrentApprovalMode = async () => {
  if (isDbConnected()) {
    try {
      let config = await SystemConfig.findOne({ key: 'approval_mode' });
      if (!config) {
        config = await SystemConfig.create({ key: 'approval_mode', value: 'manual' });
      }
      return config.value;
    } catch (e) {
      console.warn('SystemConfig query error:', e.message);
    }
  }
  return memoryConfig.approval_mode || 'manual';
};

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * @desc    Get current approval mode setting
 * @route   GET /api/auth/config
 * @access  Public
 */
const getApprovalConfig = async (req, res) => {
  try {
    const mode = await fetchCurrentApprovalMode();
    return res.status(200).json({
      success: true,
      approval_mode: mode
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Update global approval mode setting (Admin only)
 * @route   PUT /api/auth/config
 * @access  Private/Admin
 */
const updateApprovalConfig = async (req, res) => {
  try {
    const { approval_mode } = req.body;
    if (!approval_mode || !['manual', 'automatic'].includes(approval_mode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval_mode. Must be "manual" or "automatic"'
      });
    }

    if (isDbConnected()) {
      await SystemConfig.findOneAndUpdate(
        { key: 'approval_mode' },
        { value: approval_mode },
        { upsert: true, new: true }
      );
    }
    memoryConfig.approval_mode = approval_mode;

    return res.status(200).json({
      success: true,
      message: `Approval mode updated to ${approval_mode}`,
      approval_mode
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Register a new user (student, teacher, or admin)
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const requestedRole = (role || 'employee').toLowerCase().trim();

    if (!ALLOWED_ROLES.includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role '${role}'. Role must be one of: ${ALLOWED_ROLES.join(', ')}`
      });
    }

    const currentMode = await fetchCurrentApprovalMode();
    let initialStatus = currentMode === 'automatic' ? 'approved' : 'pending';
    
    // Seed admin or explicitly configured accounts can be auto-approved
    if (normalizedEmail === 'admin@edupulse.com') {
      initialStatus = 'approved';
    }

    if (isDbConnected()) {
      const userExists = await User.findOne({ email: normalizedEmail });
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists'
        });
      }

      const user = await User.create({
        name,
        email: normalizedEmail,
        password,
        role: requestedRole,
        approval_status: initialStatus,
        approved_at: initialStatus === 'approved' ? new Date() : null,
        approved_by: initialStatus === 'approved' ? 'system' : null
      });

      if (initialStatus === 'approved') {
        const token = generateToken(user._id, user.role);
        return res.status(201).json({
          success: true,
          approved: true,
          message: 'Registration successful. Account approved.',
          token,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            approval_status: user.approval_status
          }
        });
      }

      return res.status(201).json({
        success: true,
        pending: true,
        message: 'Registration submitted. Waiting for Admin approval.',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          approval_status: user.approval_status
        }
      });
    }

    // Memory fallback mode
    const existingMemoryUser = memoryUsers.find((u) => u.email === normalizedEmail);
    if (existingMemoryUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newMemoryUser = {
      _id: `usr_${Date.now()}`,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: requestedRole,
      approval_status: initialStatus,
      approved_at: initialStatus === 'approved' ? new Date() : null,
      approved_by: initialStatus === 'approved' ? 'system' : null,
      rejection_reason: '',
      createdAt: new Date()
    };

    memoryUsers.push(newMemoryUser);

    if (initialStatus === 'approved') {
      const token = generateToken(newMemoryUser._id, newMemoryUser.role);
      return res.status(201).json({
        success: true,
        approved: true,
        message: 'Registration successful (dev mode). Account approved.',
        token,
        user: {
          _id: newMemoryUser._id,
          name: newMemoryUser.name,
          email: newMemoryUser.email,
          role: newMemoryUser.role,
          approval_status: newMemoryUser.approval_status
        }
      });
    }

    return res.status(201).json({
      success: true,
      pending: true,
      message: 'Registration submitted. Waiting for Admin approval.',
      user: {
        _id: newMemoryUser._id,
        name: newMemoryUser.name,
        email: newMemoryUser.email,
        role: newMemoryUser.role,
        approval_status: newMemoryUser.approval_status
      }
    });
  } catch (error) {
    console.error('Register User Error:', error);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Authenticate user & check approval status
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isDbConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const status = user.approval_status || 'approved'; // Migration fallback

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
          message: `Your registration request has been rejected.${user.rejection_reason ? ' Reason: ' + user.rejection_reason : ''}`
        });
      }

      if (role && role.toLowerCase().trim() !== user.role) {
        return res.status(403).json({
          success: false,
          message: `Account exists as ${user.role}. Please select '${user.role}' to sign in.`
        });
      }

      const token = generateToken(user._id, user.role);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          approval_status: status
        }
      });
    }

    // In-memory fallback mode
    const user = memoryUsers.find((u) => u.email === normalizedEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const status = user.approval_status || 'approved';

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
        message: `Your registration request has been rejected.${user.rejection_reason ? ' Reason: ' + user.rejection_reason : ''}`
      });
    }

    if (role && role.toLowerCase().trim() !== user.role) {
      return res.status(403).json({
        success: false,
        message: `Account exists as ${user.role}. Please select '${user.role}' to sign in.`
      });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Login successful (dev mode)',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approval_status: status
      }
    });
  } catch (error) {
    console.error('Login User Error:', error);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Get all registered users & approval stats (admin only)
 * @route   GET /api/auth/users
 * @access  Private/Admin
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, status } = req.query;

    if (isDbConnected()) {
      const filter = {};
      if (role) filter.role = role.toLowerCase().trim();
      if (status) filter.approval_status = status.toLowerCase().trim();

      const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

      const counts = {
        total: await User.countDocuments(),
        pending: await User.countDocuments({ approval_status: 'pending' }),
        approved: await User.countDocuments({ approval_status: 'approved' }),
        rejected: await User.countDocuments({ approval_status: 'rejected' }),
        employee: await User.countDocuments({ role: 'employee' }),
        admin: await User.countDocuments({ role: 'admin' })
      };

      return res.status(200).json({
        success: true,
        count: users.length,
        counts,
        data: users
      });
    }

    // In-memory fallback
    let result = memoryUsers;
    if (role) {
      const targetRole = role.toLowerCase().trim();
      result = result.filter((u) => u.role === targetRole);
    }
    if (status) {
      const targetStatus = status.toLowerCase().trim();
      result = result.filter((u) => (u.approval_status || 'approved') === targetStatus);
    }

    const memoryCounts = {
      total: memoryUsers.length,
      pending: memoryUsers.filter((u) => u.approval_status === 'pending').length,
      approved: memoryUsers.filter((u) => (u.approval_status || 'approved') === 'approved').length,
      rejected: memoryUsers.filter((u) => u.approval_status === 'rejected').length,
      employee: memoryUsers.filter((u) => u.role === 'employee').length,
      admin: memoryUsers.filter((u) => u.role === 'admin').length
    };

    const sanitizedUsers = result.map(({ password, ...u }) => u);

    return res.status(200).json({
      success: true,
      count: sanitizedUsers.length,
      counts: memoryCounts,
      data: sanitizedUsers
    });
  } catch (error) {
    console.error('Get All Users Error:', error);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Approve user registration request (admin only)
 * @route   PUT /api/auth/users/:id/approve
 * @access  Private/Admin
 */
const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      user.approval_status = 'approved';
      user.approved_at = new Date();
      user.approved_by = req.user ? req.user.email : 'admin';
      user.rejection_reason = '';
      await user.save();

      return res.status(200).json({
        success: true,
        message: `Account for ${user.name} (${user.role}) approved successfully.`,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          approval_status: user.approval_status
        }
      });
    }

    const user = memoryUsers.find((u) => u._id === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.approval_status = 'approved';
    user.approved_at = new Date();
    user.approved_by = req.user ? req.user.email : 'admin';
    user.rejection_reason = '';

    return res.status(200).json({
      success: true,
      message: `Account for ${user.name} (${user.role}) approved successfully.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approval_status: user.approval_status
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Reject user registration request (admin only)
 * @route   PUT /api/auth/users/:id/reject
 * @access  Private/Admin
 */
const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (isDbConnected()) {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      user.approval_status = 'rejected';
      user.rejection_reason = rejection_reason || 'Registration request rejected by Administrator.';
      await user.save();

      return res.status(200).json({
        success: true,
        message: `Account for ${user.name} (${user.role}) rejected.`,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          approval_status: user.approval_status,
          rejection_reason: user.rejection_reason
        }
      });
    }

    const user = memoryUsers.find((u) => u._id === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.approval_status = 'rejected';
    user.rejection_reason = rejection_reason || 'Registration request rejected by Administrator.';

    return res.status(200).json({
      success: true,
      message: `Account for ${user.name} (${user.role}) rejected.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approval_status: user.approval_status,
        rejection_reason: user.rejection_reason
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Generate password reset verification token
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide registered email address' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    if (isDbConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ success: false, message: 'No account found with this email address' });
      }

      user.reset_password_token = resetToken;
      user.reset_password_expires = resetExpires;
      await user.save();

      return res.status(200).json({
        success: true,
        message: `Password reset verification code generated for ${normalizedEmail}.`,
        resetToken,
        email: normalizedEmail
      });
    }

    // Memory fallback
    const user = memoryUsers.find((u) => u.email === normalizedEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address' });
    }

    user.reset_password_token = resetToken;
    user.reset_password_expires = resetExpires;

    return res.status(200).json({
      success: true,
      message: `Password reset verification code generated for ${normalizedEmail}.`,
      resetToken,
      email: normalizedEmail
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
};

/**
 * @desc    Reset password using reset token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide email, verification code, and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const tokenStr = resetToken.toString().trim();

    if (isDbConnected()) {
      const user = await User.findOne({
        email: normalizedEmail,
        reset_password_token: tokenStr,
        reset_password_expires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
      }

      user.password = newPassword;
      user.reset_password_token = null;
      user.reset_password_expires = null;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.'
      });
    }

    // Memory fallback
    const user = memoryUsers.find(
      (u) =>
        u.email === normalizedEmail &&
        u.reset_password_token === tokenStr &&
        u.reset_password_expires &&
        new Date(u.reset_password_expires) > new Date()
    );

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.reset_password_token = null;
    user.reset_password_expires = null;

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getAllUsers,
  approveUser,
  rejectUser,
  getApprovalConfig,
  updateApprovalConfig,
  forgotPassword,
  resetPassword,
  memoryUsers,
  memoryConfig
};
