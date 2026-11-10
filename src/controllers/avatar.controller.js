const { uploadToS3, deleteFromS3 } = require('../utils/s3Uploader');
const { sendSuccess, sendFailure } = require('../utils/response');

/**
 * POST /api/avatar/upload
 * Accepts multipart/form-data with field "avatar" (image file).
 * Optionally accepts "oldAvatarUrl" field to delete the previous S3 image.
 * Uploads to S3 and returns the public URL.
 */
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return sendFailure(res, 'No file uploaded', 400);
    }

    const { buffer, originalname, mimetype } = req.file;

    // Validate it's an image
    if (!mimetype.startsWith('image/')) {
      return sendFailure(res, 'Only image files are allowed', 400);
    }

    // Max 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return sendFailure(res, 'Image must be under 5MB', 400);
    }

    // Upload new image to S3
    const url = await uploadToS3(buffer, originalname, mimetype);

    // Delete old avatar from S3 if provided (non-blocking)
    const oldAvatarUrl = req.body?.oldAvatarUrl;
    if (oldAvatarUrl && oldAvatarUrl !== url) {
      deleteFromS3(oldAvatarUrl);
    }

    return sendSuccess(res, 'Avatar uploaded successfully', { url }, 201);
  } catch (err) {
    console.error('❌ Avatar upload error:', err.message);
    return sendFailure(res, 'Failed to upload avatar', 500);
  }
};
