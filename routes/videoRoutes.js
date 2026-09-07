const express = require('express');
const router = express.Router();
const {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo
} = require('../controllers/videoController');
const { requireAdmin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getVideos);
router.get('/:id', getVideoById);

// Admin protected routes
router.post('/', requireAdmin, createVideo);
router.put('/:id', requireAdmin, updateVideo);
router.delete('/:id', requireAdmin, deleteVideo);

module.exports = router;
