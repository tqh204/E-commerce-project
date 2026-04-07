var express = require('express');
var router = express.Router();
var uploadController = require('../controllers/uploadController');
var authMiddleware = require('../middleware/auth');
var multerUpload = require('../middleware/multerUpload');
var httpLib = require('../lib/http');

var sendError = httpLib.sendError;
var sendSuccess = httpLib.sendSuccess;

var handleRouteError = function(res, error) {
  return sendError(res, error.message || 'Internal server error', error.status || 500, error.details);
};

var buildActor = function(req) {
  return {
    user: req.user,
    userRoles: req.userRoles || [],
  };
};

router.post('/base64', authMiddleware.requireAuth, async function(req, res) {
  try {
    var media = await uploadController.uploadBase64(req.body || {}, req);
    return sendSuccess(res, media, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/multipart', authMiddleware.requireAuth, multerUpload.upload.single('file'), async function(req, res) {
  try {
    var media = await uploadController.uploadMultipart(req.body || {}, req.file, req);
    return sendSuccess(res, media, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post(
  '/multipart-many',
  authMiddleware.requireAuth,
  multerUpload.upload.array('files', 5),
  async function(req, res) {
    try {
      var medias = await uploadController.uploadMultipartMany(req.body || {}, req.files, req);
      return sendSuccess(res, medias, null, 201);
    } catch (error) {
      return handleRouteError(res, error);
    }
  }
);

router.post('/remote', authMiddleware.requireAuth, async function(req, res) {
  try {
    var media = await uploadController.registerRemoteMedia(req.body || {}, req);
    return sendSuccess(res, media, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var deleted = await uploadController.deleteMedia(req.params.id, buildActor(req));
    if (!deleted) {
      return sendError(res, 'Media not found', 404);
    }
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
