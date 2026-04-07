var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var multer = require('multer');

var uploadRoot = path.join(__dirname, '..', 'public', 'uploads');

var ensureUploadDirectory = function(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
};

var buildUploadTarget = function() {
  var now = new Date();
  var year = String(now.getFullYear());
  var month = String(now.getMonth() + 1);
  var targetDir;

  if (month.length < 2) {
    month = '0' + month;
  }

  targetDir = path.join(uploadRoot, year, month);
  ensureUploadDirectory(targetDir);
  return targetDir;
};

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, buildUploadTarget());
  },
  filename: function(req, file, cb) {
    var extension = path.extname(file.originalname || '') || '.bin';
    var fileName = crypto.randomBytes(16).toString('hex') + extension;
    cb(null, fileName);
  },
});

var fileFilter = function(req, file, cb) {
  if (!file.mimetype) {
    return cb(new Error('Invalid file type'));
  }

  return cb(null, true);
};

var upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});

module.exports = {
  upload: upload,
  uploadRoot: uploadRoot,
  ensureUploadDirectory: ensureUploadDirectory,
};
