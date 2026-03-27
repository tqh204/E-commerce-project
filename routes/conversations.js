const express = require('express');
const controller = require('../controllers/conversationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listConversations);
router.post('/', controller.createConversation);
router.get('/:id/messages', controller.getConversationMessages);
router.post('/:id/messages', controller.sendMessage);
router.patch('/:id/messages/:messageId', controller.updateMessage);
router.patch('/:id/read', controller.markConversationRead);
router.delete('/:id/messages/:messageId', controller.deleteMessage);
router.delete('/:id/messages/:messageId/media/:mediaId', controller.deleteMessageAttachment);

module.exports = router;
