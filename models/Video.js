const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    youtubeUrl: {
      type: String,
      required: [true, 'YouTube URL is required'],
      trim: true
    },
    youtubeVideoId: {
      type: String,
      required: [true, 'YouTube Video ID is required'],
      trim: true
    },
    thumbnail: {
      type: String,
      default: '',
      trim: true
    },
    priority: {
      type: Number,
      default: 1,
      min: [1, 'Priority must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Priority must be a positive integer'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Video', videoSchema);
