const express = require('express');
const router = express.Router();
const {
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember
} = require('../controllers/teamController');
const { requireAdmin } = require('../middleware/authMiddleware');
const { handleUpload } = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', getTeamMembers);
router.get('/:id', getTeamMemberById);

// Protected routes (Admin only) with Multer upload middleware
router.post('/', requireAdmin, handleUpload('image'), createTeamMember);
router.put('/:id', requireAdmin, handleUpload('image'), updateTeamMember);
router.delete('/:id', requireAdmin, deleteTeamMember);

module.exports = router;
