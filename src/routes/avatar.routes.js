const express  = require('express');
const multer   = require('multer');
const router   = express.Router();
const { uploadAvatar } = require('../controllers/avatar.controller');

// Use memory storage — we pass the buffer directly to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// POST /api/avatar/upload
router.post('/upload', upload.single('avatar'), uploadAvatar);

module.exports = router;
