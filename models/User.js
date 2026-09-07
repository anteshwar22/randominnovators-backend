const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ALLOWED_ROLES = ['employee', 'admin'];
const ALLOWED_STATUSES = ['pending', 'approved', 'rejected'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6
    },
    role: {
      type: String,
      enum: {
        values: ALLOWED_ROLES,
        message: 'Role must be one of: employee, admin'
      },
      default: 'employee',
      lowercase: true,
      trim: true
    },
    approval_status: {
      type: String,
      enum: {
        values: ALLOWED_STATUSES,
        message: 'Status must be one of: pending, approved, rejected'
      },
      default: 'pending',
      lowercase: true,
      trim: true
    },
    approved_by: {
      type: String,
      default: null
    },
    approved_at: {
      type: Date,
      default: null
    },
    rejection_reason: {
      type: String,
      default: '',
      trim: true
    },
    reset_password_token: {
      type: String,
      default: null
    },
    reset_password_expires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare input password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ALLOWED_ROLES = ALLOWED_ROLES;
module.exports.ALLOWED_STATUSES = ALLOWED_STATUSES;
