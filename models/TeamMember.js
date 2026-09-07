const mongoose = require('mongoose');

const ALLOWED_CATEGORIES = ['team', 'mentor', 'employee', 'admin'];

const teamMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ALLOWED_CATEGORIES,
        message: 'Category must be one of: team, mentor, employee, admin'
      },
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    image_url: {
      type: String,
      default: '',
      trim: true
    },
    github_url: {
      type: String,
      default: '',
      trim: true
    },
    linkedin_url: {
      type: String,
      default: '',
      trim: true
    },
    serialNo: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('TeamMember', teamMemberSchema);
module.exports.ALLOWED_CATEGORIES = ALLOWED_CATEGORIES;
