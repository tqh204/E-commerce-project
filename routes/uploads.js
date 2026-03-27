const express = require('express');
const controller = require('../controllers/uploadController');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/multerUpload');

const router = express.Router();

router.use(requireAuth);
router.post('/base64', controller.uploadBase64);
router.post('/multipart', upload.single('file'), controller.uploadMultipart);
router.post('/multipart-many', upload.array('files', 5), controller.uploadMultipartMany);
router.post('/remote', controller.registerRemoteMedia);
router.delete('/:id', controller.deleteMedia);

module.exports = router;
