const router = require('express').Router();
const path   = require('path');
const auth   = require('../middleware/auth');
const upload = require('../middleware/upload');

// Upload a file — returns the URL to use in a message
router.post('/', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const mime = req.file.mimetype;
  let mediaType = 'file';
  if (mime.startsWith('image/'))  mediaType = 'image';
  if (mime.startsWith('video/'))  mediaType = 'video';
  if (mime.startsWith('audio/'))  mediaType = 'audio';

  res.json({
    mediaUrl:  `/uploads/${req.file.filename}`,
    mediaType,
    mediaName: req.file.originalname,
  });
});

module.exports = router;
