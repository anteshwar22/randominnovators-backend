const TeamMember = require('../models/TeamMember');
const { ALLOWED_CATEGORIES } = require('../models/TeamMember');
const { uploadToImageKit } = require('../config/imagekit');
const mongoose = require('mongoose');

// In-memory fallback storage, used only when MongoDB is unreachable so the
// API (and the frontend built against it) still works during local dev/demo.
let memoryMembers = [
  {
    _id: 'mem_1',
    name: 'Alex Rivera',
    role: 'Lead Full Stack Developer',
    category: 'team',
    description: 'Architected the dynamic MCQ evaluation engine and real-time state management.',
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    github_url: 'https://github.com',
    linkedin_url: 'https://linkedin.com',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'mem_2',
    name: 'Sarah Chen',
    role: 'Frontend & UI/UX Engineer',
    category: 'team',
    description: 'Designed the modern glassmorphism aesthetic and responsive dashboards.',
    image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    github_url: 'https://github.com',
    linkedin_url: 'https://linkedin.com',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'mem_mentor_1',
    name: 'Prof. Mayur Raut',
    role: 'Academic Advisor & Mentor',
    category: 'mentor',
    description: 'Guided by industry leaders and educators committed to elevating classroom interactive standards.',
    image_url: 'https://ik.imagekit.io/anteshwar27/learning-platform/team/1661493985532.jpg',
    github_url: '',
    linkedin_url: 'https://www.linkedin.com/in/prof-mayur-raut-6241b324a/',
    serialNo: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

/**
 * @desc    Get all team members (optionally filter by category)
 * @route   GET /api/team
 * @access  Public
 */
const getTeamMembers = async (req, res) => {
  try {
    const { category } = req.query;
    let normalizedCategory = null;

    if (category) {
      normalizedCategory = category.toLowerCase().trim();
      if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category '${category}'. Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
        });
      }
    }

    if (isDbConnected()) {
      const filter = normalizedCategory ? { category: normalizedCategory } : {};
      const members = await TeamMember.find(filter).sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        count: members.length,
        data: members
      });
    }

    let result = memoryMembers;
    if (normalizedCategory) {
      result = memoryMembers.filter((m) => m.category === normalizedCategory);
    }
    return res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('Get Team Members Error:', error);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Get single team member by ID
 * @route   GET /api/team/:id
 * @access  Public
 */
const getTeamMemberById = async (req, res) => {
  try {
    if (isDbConnected()) {
      const member = await TeamMember.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, message: 'Team member not found' });
      }
      return res.status(200).json({ success: true, data: member });
    }

    const member = memoryMembers.find((m) => m._id === req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }
    return res.status(200).json({ success: true, data: member });
  } catch (error) {
    console.error('Get Team Member By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Create a new team member with ImageKit upload
 * @route   POST /api/team
 * @access  Private (Admin)
 */
const createTeamMember = async (req, res) => {
  try {
    const { name, role, category, description, github_url, linkedin_url, image_url: fallbackImageUrl, serialNo } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!role || !role.trim()) {
      return res.status(400).json({ success: false, message: 'Role is required' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const normalizedCategory = category.toLowerCase().trim();
    if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category '${category}'. Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
      });
    }

    let finalImageUrl = fallbackImageUrl ? fallbackImageUrl.trim() : '';

    if (req.file) {
      try {
        const uploadRes = await uploadToImageKit(req.file.buffer, req.file.originalname);
        finalImageUrl = uploadRes.url;
      } catch (uploadErr) {
        console.error('ImageKit Upload Failed:', uploadErr);
        return res.status(500).json({
          success: false,
          message: 'Image upload failed. Please try again.'
        });
      }
    }

    const memberData = {
      name: name.trim(),
      role: role.trim(),
      category: normalizedCategory,
      description: description ? description.trim() : '',
      image_url: finalImageUrl,
      github_url: github_url ? github_url.trim() : '',
      linkedin_url: linkedin_url ? linkedin_url.trim() : '',
      serialNo: serialNo !== undefined ? Number(serialNo) : 0
    };

    let member;

    if (isDbConnected()) {
      member = await TeamMember.create(memberData);
      console.log('MongoDB Insert Success:', member._id);
    } else {
      member = {
        _id: 'mem_' + Date.now(),
        ...memberData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryMembers.unshift(member);
      console.log('Memory Insert Success:', member._id);
    }

    return res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      data: member
    });
  } catch (error) {
    console.error('Create Team Member Error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create team member'
    });
  }
};

/**
 * @desc    Update a team member (optionally updates image via ImageKit)
 * @route   PUT /api/team/:id
 * @access  Private (Admin)
 */
const updateTeamMember = async (req, res) => {
  try {
    const { name, role, category, description, github_url, linkedin_url, image_url: bodyImageUrl, serialNo } = req.body;

    let member;
    if (isDbConnected()) {
      member = await TeamMember.findById(req.params.id);
    } else {
      member = memoryMembers.find((m) => m._id === req.params.id);
    }

    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    if (category) {
      const normalizedCategory = category.toLowerCase().trim();
      if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category '${category}'. Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
        });
      }
    }

    let updatedImageUrl = member.image_url;

    if (req.file) {
      try {
        const uploadRes = await uploadToImageKit(req.file.buffer, req.file.originalname);
        updatedImageUrl = uploadRes.url;
      } catch (uploadErr) {
        console.error('ImageKit Upload Failed:', uploadErr);
        return res.status(500).json({
          success: false,
          message: 'Image upload failed. Please try again.'
        });
      }
    } else if (bodyImageUrl !== undefined && bodyImageUrl.trim()) {
      updatedImageUrl = bodyImageUrl.trim();
    }

    const updateFields = {
      ...(name && { name: name.trim() }),
      ...(role && { role: role.trim() }),
      ...(category && { category: category.toLowerCase().trim() }),
      ...(description !== undefined && { description: description.trim() }),
      image_url: updatedImageUrl,
      ...(github_url !== undefined && { github_url: github_url.trim() }),
      ...(linkedin_url !== undefined && { linkedin_url: linkedin_url.trim() }),
      ...(serialNo !== undefined && { serialNo: Number(serialNo) }),
      updatedAt: new Date()
    };

    if (isDbConnected()) {
      member = await TeamMember.findByIdAndUpdate(req.params.id, updateFields, {
        new: true,
        runValidators: true
      });
      console.log('MongoDB Update Success:', member._id);
    } else {
      Object.assign(member, updateFields);
      console.log('Memory Update Success:', member._id);
    }

    return res.status(200).json({
      success: true,
      message: 'Team member updated successfully',
      data: member
    });
  } catch (error) {
    console.error('Update Team Member Error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update team member'
    });
  }
};

/**
 * @desc    Delete a team member
 * @route   DELETE /api/team/:id
 * @access  Private (Admin)
 */
const deleteTeamMember = async (req, res) => {
  try {
    if (isDbConnected()) {
      const member = await TeamMember.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, message: 'Team member not found' });
      }
      await member.deleteOne();
      console.log('MongoDB Delete Success:', req.params.id);
    } else {
      const index = memoryMembers.findIndex((m) => m._id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Team member not found' });
      }
      memoryMembers.splice(index, 1);
      console.log('Memory Delete Success:', req.params.id);
    }

    return res.status(200).json({
      success: true,
      message: 'Team member deleted successfully'
    });
  } catch (error) {
    console.error('Delete Team Member Error:', error);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

module.exports = {
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember
};
