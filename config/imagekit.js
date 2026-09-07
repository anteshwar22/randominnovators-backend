const ImageKit = require('imagekit');
require('dotenv').config();

let imagekit = null;

const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

if (publicKey && privateKey && urlEndpoint && !publicKey.includes('your_')) {
  try {
    imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint
    });
    console.log('ImageKit SDK initialized successfully.');
  } catch (err) {
    console.error('ImageKit initialization error:', err.message);
  }
} else {
  console.log('ImageKit credentials not provided or using placeholders; image upload endpoints will return an error until configured.');
}

/**
 * Upload an image buffer to ImageKit.
 * @param {Buffer} fileBuffer - Image file buffer from multer
 * @param {string} originalName - Original filename
 * @returns {Promise<{url: string, fileId: string}>}
 */
const uploadToImageKit = async (fileBuffer, originalName) => {
  if (!fileBuffer) {
    throw new Error('Image file is required.');
  }

  if (!imagekit) {
    throw new Error('ImageKit is not configured. Please check ImageKit environment variables.');
  }

  const fileExtension = originalName ? originalName.split('.').pop() : 'jpg';
  const fileName = `team_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;

  const base64File = fileBuffer.toString('base64');

  const result = await imagekit.upload({
    file: base64File,
    fileName,
    folder: '/Random_Innovators/team/'
  });

  console.log('ImageKit Upload Success:', result.url);
  return {
    url: result.url,
    fileId: result.fileId
  };
};

module.exports = {
  imagekit,
  uploadToImageKit
};
