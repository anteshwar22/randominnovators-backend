const Video = require('../models/Video');
const mongoose = require('mongoose');

// In-memory fallback storage for videos when MongoDB connection is unavailable
let memoryVideos = [
  {
    _id: 'vid_1',
    title: 'Introduction to Web Development & MERN Stack',
    description: 'Learn the fundamentals of modern full-stack web development using MongoDB, Express, React, and Node.js.',
    youtubeUrl: 'https://www.youtube.com/watch?v=gY5sGvq-8h8',
    youtubeVideoId: 'gY5sGvq-8h8',
    thumbnail: 'https://img.youtube.com/vi/gY5sGvq-8h8/hqdefault.jpg',
    priority: 1,
    isActive: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  {
    _id: 'vid_2',
    title: 'React.js Full Course - Beginner to Pro',
    description: 'Master React components, state management, hooks, and modern frontend architecture in this comprehensive guide.',
    youtubeUrl: 'https://www.youtube.com/watch?v=w7ejDZ8SWv8',
    youtubeVideoId: 'w7ejDZ8SWv8',
    thumbnail: 'https://img.youtube.com/vi/w7ejDZ8SWv8/hqdefault.jpg',
    priority: 2,
    isActive: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  }
];

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

/**
 * Extracts YouTube Video ID from various YouTube URL formats
 * Supported formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
const extractYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.trim().match(regExp);
  return (match && match[2] && match[2].length === 11) ? match[2] : null;
};

/**
 * @desc    Get videos (Public fetches active only; Admin fetches all if query param all=true or admin request)
 * @route   GET /api/videos
 * @access  Public / Admin
 */
const getVideos = async (req, res) => {
  try {
    const fetchAll = req.query.all === 'true';

    if (isDbConnected()) {
      const filter = fetchAll ? {} : { isActive: true };
      const videos = await Video.find(filter).sort({ priority: 1, createdAt: 1 });
      return res.status(200).json({
        success: true,
        count: videos.length,
        data: videos
      });
    }

    // In-memory fallback
    let result = [...memoryVideos];
    if (!fetchAll) {
      result = result.filter((v) => v.isActive !== false);
    }
    result.sort((a, b) => {
      const pA = Number(a.priority) || 1;
      const pB = Number(b.priority) || 1;
      if (pA !== pB) return pA - pB;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('Get Videos Error:', error);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Get single video by ID
 * @route   GET /api/videos/:id
 * @access  Public
 */
const getVideoById = async (req, res) => {
  try {
    if (isDbConnected()) {
      const video = await Video.findById(req.params.id);
      if (!video) {
        return res.status(404).json({ success: false, message: 'Video not found' });
      }
      return res.status(200).json({ success: true, data: video });
    }

    const video = memoryVideos.find((v) => v._id === req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    return res.status(200).json({ success: true, data: video });
  } catch (error) {
    console.error('Get Video By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

/**
 * @desc    Create a new video
 * @route   POST /api/videos
 * @access  Private (Admin)
 */
const createVideo = async (req, res) => {
  try {
    const { title, description, youtubeUrl, thumbnail, isActive, priority } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Video title is required' });
    }

    if (!youtubeUrl || !youtubeUrl.trim()) {
      return res.status(400).json({ success: false, message: 'YouTube URL is required' });
    }

    const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);
    if (!youtubeVideoId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid YouTube URL. Supported formats: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID'
      });
    }

    let parsedPriority = 1;
    if (priority !== undefined && priority !== null && priority !== '') {
      const p = Number(priority);
      if (!Number.isInteger(p) || p < 1) {
        return res.status(400).json({
          success: false,
          message: 'Priority must be a positive integer (1, 2, 3, etc.)'
        });
      }
      parsedPriority = p;
    }

    // Auto generate default thumbnail from YouTube if not provided
    const finalThumbnail = (thumbnail && thumbnail.trim())
      ? thumbnail.trim()
      : `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;

    const videoData = {
      title: title.trim(),
      description: description ? description.trim() : '',
      youtubeUrl: youtubeUrl.trim(),
      youtubeVideoId,
      thumbnail: finalThumbnail,
      priority: parsedPriority,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    };

    let video;

    if (isDbConnected()) {
      video = await Video.create(videoData);
      console.log('MongoDB Insert Video Success:', video._id);
    } else {
      video = {
        _id: 'vid_' + Date.now(),
        ...videoData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryVideos.unshift(video);
      console.log('Memory Insert Video Success:', video._id);
    }

    return res.status(201).json({
      success: true,
      message: 'Video added successfully',
      data: video
    });
  } catch (error) {
    console.error('Create Video Error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create video'
    });
  }
};

/**
 * @desc    Update video by ID
 * @route   PUT /api/videos/:id
 * @access  Private (Admin)
 */
const updateVideo = async (req, res) => {
  try {
    const { title, description, youtubeUrl, thumbnail, isActive, priority } = req.body;

    let video;
    if (isDbConnected()) {
      video = await Video.findById(req.params.id);
    } else {
      video = memoryVideos.find((v) => v._id === req.params.id);
    }

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    let youtubeVideoId = video.youtubeVideoId;
    if (youtubeUrl && youtubeUrl.trim() !== video.youtubeUrl) {
      const extractedId = extractYouTubeVideoId(youtubeUrl);
      if (!extractedId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid YouTube URL. Supported formats: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID'
        });
      }
      youtubeVideoId = extractedId;
    }

    let finalThumbnail = video.thumbnail;
    if (thumbnail !== undefined) {
      finalThumbnail = thumbnail.trim()
        ? thumbnail.trim()
        : `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
    } else if (youtubeVideoId !== video.youtubeVideoId && (!video.thumbnail || video.thumbnail.includes('img.youtube.com'))) {
      finalThumbnail = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
    }

    let parsedPriority;
    if (priority !== undefined && priority !== null && priority !== '') {
      const p = Number(priority);
      if (!Number.isInteger(p) || p < 1) {
        return res.status(400).json({
          success: false,
          message: 'Priority must be a positive integer (1, 2, 3, etc.)'
        });
      }
      parsedPriority = p;
    }

    const updateFields = {
      ...(title && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(youtubeUrl && { youtubeUrl: youtubeUrl.trim() }),
      youtubeVideoId,
      thumbnail: finalThumbnail,
      ...(parsedPriority !== undefined && { priority: parsedPriority }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      updatedAt: new Date()
    };

    if (isDbConnected()) {
      video = await Video.findByIdAndUpdate(req.params.id, updateFields, {
        new: true,
        runValidators: true
      });
      console.log('MongoDB Update Video Success:', video._id);
    } else {
      Object.assign(video, updateFields);
      console.log('Memory Update Video Success:', video._id);
    }

    return res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: video
    });
  } catch (error) {
    console.error('Update Video Error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update video'
    });
  }
};

/**
 * @desc    Delete video by ID
 * @route   DELETE /api/videos/:id
 * @access  Private (Admin)
 */
const deleteVideo = async (req, res) => {
  try {
    if (isDbConnected()) {
      const video = await Video.findById(req.params.id);
      if (!video) {
        return res.status(404).json({ success: false, message: 'Video not found' });
      }
      await video.deleteOne();
      console.log('MongoDB Delete Video Success:', req.params.id);
    } else {
      const index = memoryVideos.findIndex((v) => v._id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Video not found' });
      }
      memoryVideos.splice(index, 1);
      console.log('Memory Delete Video Success:', req.params.id);
    }

    return res.status(200).json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Delete Video Error:', error);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

module.exports = {
  extractYouTubeVideoId,
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo
};
