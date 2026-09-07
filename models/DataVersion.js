const mongoose = require('mongoose');

const dataVersionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'public-data-version'
    },
    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DataVersion', dataVersionSchema);
