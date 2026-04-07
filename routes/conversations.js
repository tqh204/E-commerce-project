var express = require('express');
var router = express.Router();
var conversationController = require('../controllers/conversationController');
var authMiddleware = require('../middleware/auth');
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

router.get('/', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await conversationController.listConversations(req.query || {}, buildActor(req));
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/', authMiddleware.requireAuth, async function(req, res) {
  try {
    var conversation = await conversationController.createConversation(req.body || {}, buildActor(req));
    return sendSuccess(res, conversation, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/:id/messages', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await conversationController.getConversationMessages(
      req.params.id,
      req.query || {},
      buildActor(req)
    );
    if (!result) {
      return sendError(res, 'Conversation not found', 404);
    }
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/:id/messages', authMiddleware.requireAuth, async function(req, res) {
  try {
    var message = await conversationController.sendMessage(req.params.id, req.body || {}, buildActor(req));
    if (!message) {
      return sendError(res, 'Conversation not found', 404);
    }
    return sendSuccess(res, message, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/:id/messages/:messageId', authMiddleware.requireAuth, async function(req, res) {
  try {
    var message = await conversationController.updateMessage(
      req.params.id,
      req.params.messageId,
      req.body || {},
      buildActor(req)
    );
    if (message === null) {
      return sendError(res, 'Conversation not found', 404);
    }
    if (message === false) {
      return sendError(res, 'Message not found', 404);
    }
    return sendSuccess(res, message);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/:id/read', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await conversationController.markConversationRead(req.params.id, buildActor(req));
    if (!result) {
      return sendError(res, 'Conversation not found', 404);
    }
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete('/:id/messages/:messageId', authMiddleware.requireAuth, async function(req, res) {
  try {
    var message = await conversationController.deleteMessage(
      req.params.id,
      req.params.messageId,
      buildActor(req)
    );
    if (message === null) {
      return sendError(res, 'Conversation not found', 404);
    }
    if (message === false) {
      return sendError(res, 'Message not found', 404);
    }
    return sendSuccess(res, message);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete(
  '/:id/messages/:messageId/media/:mediaId',
  authMiddleware.requireAuth,
  async function(req, res) {
    try {
      var message = await conversationController.deleteMessageAttachment(
        req.params.id,
        req.params.messageId,
        req.params.mediaId,
        buildActor(req)
      );
      if (message === null) {
        return sendError(res, 'Conversation not found', 404);
      }
      if (message === false) {
        return sendError(res, 'Message not found', 404);
      }
      return sendSuccess(res, message);
    } catch (error) {
      return handleRouteError(res, error);
    }
  }
);

module.exports = router;
