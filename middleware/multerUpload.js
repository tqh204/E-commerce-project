const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadRoot = path.join(__dirname, '..', 'public', 'uploads');

const ensureUploadDirectory = (targetDir) => {
  fs.mkdirSync(targetDir, { recursive: true });
};

const buildUploadTarget = () => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const targetDir = path.join(uploadRoot, year, month);
  ensureUploadDirectory(targetDir);
  return targetDir;
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, buildUploadTarget());
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname || '') || '.bin';
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype) {
    return cb(new Error('Invalid file type'));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});

module.exports = {
  upload,
  uploadRoot,
  ensureUploadDirectory,
};
