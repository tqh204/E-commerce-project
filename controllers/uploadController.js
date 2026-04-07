var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var schemas = require('../schemas');
var socketLib = require('../lib/socket');

var Category = schemas.Category;
var Conversation = schemas.Conversation;
var Media = schemas.Media;
var Message = schemas.Message;
var Product = schemas.Product;
var User = schemas.User;
var emitMessageUpdated = socketLib.emitMessageUpdated;

var uploadRoot = path.join(__dirname, '..', 'public', 'uploads');
var mimeToExtension = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

var createControllerError = function(message, status, details) {
  var error = new Error(message);
  error.status = status || 400;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

var ensureUploadDirectory = function(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
};

var buildLocalMediaUrl = function(relativePath) {
  return '/' + relativePath.replace(/\\/g, '/');
};

var generateRandomId = function() {
  return crypto.randomBytes(16).toString('hex');
};

var syncMediaOwner = async function(options) {
  var ownerType = options.ownerType;
  var ownerId = options.ownerId;
  var media = options.media;
  var update;

  if (ownerType === 'product') {
    update = {
      $addToSet: {
        mediaIds: media._id,
        images: media.url,
      },
    };

    if (media.isPrimary) {
      update.$set = { thumbnailImage: media.url };
    }

    await Product.findByIdAndUpdate(ownerId, update);
    return;
  }

  if (ownerType === 'user') {
    await User.findByIdAndUpdate(ownerId, {
      $set: {
        avatarMedia: media._id,
        avatarUrl: media.url,
      },
    });
    return;
  }

  if (ownerType === 'message') {
    await Message.findByIdAndUpdate(ownerId, {
      $addToSet: {
        attachments: media._id,
        attachmentUrls: media.url,
      },
      $set: {
        messageType: 'image',
      },
    });
    return;
  }

  if (ownerType === 'category') {
    await Category.findByIdAndUpdate(ownerId, {
      $set: {
        image: media.url,
      },
    });
  }
};

var unsyncMediaOwner = async function(options) {
  var ownerType = options.ownerType;
  var ownerId = options.ownerId;
  var media = options.media;
  var product;
  var user;
  var patch;
  var message;
  var category;

  if (ownerType === 'product') {
    product = await Product.findById(ownerId);
    if (!product) {
      return;
    }

    product.mediaIds = (product.mediaIds || []).filter(function(id) {
      return String(id) !== String(media._id);
    });
    product.images = (product.images || []).filter(function(url) {
      return url !== media.url;
    });
    if (product.thumbnailImage === media.url) {
      product.thumbnailImage = product.images[0] || null;
    }
    await product.save();
    return;
  }

  if (ownerType === 'user') {
    user = await User.findById(ownerId).select('avatarMedia avatarUrl');
    if (!user) {
      return;
    }

    patch = {};
    if (String(user.avatarMedia || '') === String(media._id)) {
      patch.avatarMedia = null;
    }
    if (user.avatarUrl === media.url) {
      patch.avatarUrl = '';
    }
    if (Object.keys(patch).length) {
      await User.findByIdAndUpdate(ownerId, { $set: patch });
    }
    return;
  }

  if (ownerType === 'message') {
    message = await Message.findById(ownerId);
    if (!message) {
      return;
    }

    message.attachments = (message.attachments || []).filter(function(attachmentId) {
      return String(attachmentId) !== String(media._id);
    });
    message.attachmentUrls = (message.attachmentUrls || []).filter(function(url) {
      return url !== media.url;
    });
    if (!message.attachments.length && message.messageType === 'image') {
      message.messageType = 'text';
    }
    await message.save();
    return;
  }

  if (ownerType === 'category') {
    category = await Category.findById(ownerId);
    if (!category) {
      return;
    }

    if (category.image === media.url) {
      category.image = '';
      await category.save();
    }
  }
};

var emitMessageMediaUpdate = async function(ownerType, ownerId) {
  var message;
  var conversation;

  if (ownerType !== 'message') {
    return;
  }

  message = await Message.findById(ownerId)
    .populate('sender', 'username fullName avatarUrl')
    .populate('replyTo', 'content');
  if (!message) {
    return;
  }

  conversation = await Conversation.findById(message.conversation)
    .populate('participants', 'username fullName avatarUrl')
    .populate('product', 'title thumbnailImage seller');
  if (!conversation) {
    return;
  }

  emitMessageUpdated(conversation, message);
};

var createMediaFromLocalFile = async function(options) {
  var req = options.req;
  var ownerType = options.ownerType;
  var ownerId = options.ownerId;
  var filePath = options.filePath;
  var fileName = options.fileName;
  var originalName = options.originalName;
  var mimeType = options.mimeType;
  var size = options.size;
  var isPrimary = options.isPrimary || false;
  var relativePath = path.relative(path.join(__dirname, '..', 'public'), filePath);
  var mediaType = String(mimeType || '').indexOf('image/') === 0 ? 'image' : 'file';

  return Media.create({
    uploader: req.user._id,
    ownerType: ownerType,
    ownerId: ownerId,
    type: mediaType,
    storageProvider: 'local',
    url: buildLocalMediaUrl(relativePath),
    filename: fileName,
    originalName: originalName || fileName,
    mimeType: mimeType,
    size: size,
    isPrimary: isPrimary,
  });
};

module.exports.uploadBase64 = async function(body, req) {
  var ownerType = body.ownerType;
  var ownerId = body.ownerId;
  var fileName = body.fileName;
  var mimeType = body.mimeType || 'image/jpeg';
  var base64 = body.base64;
  var isPrimary = body.isPrimary || false;
  var cleaned;
  var extension;
  var now;
  var year;
  var month;
  var targetDir;
  var generatedName;
  var absoluteFilePath;
  var media;

  if (!ownerType || !ownerId || !base64) {
    throw createControllerError('ownerType, ownerId and base64 are required', 400);
  }

  cleaned = String(base64);
  if (cleaned.indexOf(',') !== -1) {
    cleaned = cleaned.split(',').pop();
  }

  extension = mimeToExtension[mimeType] || path.extname(fileName || '').replace('.', '') || 'bin';
  now = new Date();
  year = String(now.getFullYear());
  month = String(now.getMonth() + 1);
  if (month.length < 2) {
    month = '0' + month;
  }
  targetDir = path.join(uploadRoot, year, month);
  ensureUploadDirectory(targetDir);

  generatedName = generateRandomId() + '.' + extension;
  absoluteFilePath = path.join(targetDir, generatedName);
  fs.writeFileSync(absoluteFilePath, Buffer.from(cleaned, 'base64'));

  media = await createMediaFromLocalFile({
    req: req,
    ownerType: ownerType,
    ownerId: ownerId,
    filePath: absoluteFilePath,
    fileName: generatedName,
    originalName: fileName || generatedName,
    mimeType: mimeType,
    size: fs.statSync(absoluteFilePath).size,
    isPrimary: isPrimary,
  });

  await syncMediaOwner({ ownerType: ownerType, ownerId: ownerId, media: media });
  await emitMessageMediaUpdate(ownerType, ownerId);

  return media;
};

module.exports.uploadMultipart = async function(body, file, req) {
  var ownerType = body.ownerType;
  var ownerId = body.ownerId;
  var isPrimary = body.isPrimary === 'true' || body.isPrimary === true;
  var media;

  if (!ownerType || !ownerId || !file) {
    throw createControllerError('ownerType, ownerId and file are required', 400);
  }

  media = await createMediaFromLocalFile({
    req: req,
    ownerType: ownerType,
    ownerId: ownerId,
    filePath: file.path,
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    isPrimary: isPrimary,
  });

  await syncMediaOwner({ ownerType: ownerType, ownerId: ownerId, media: media });
  await emitMessageMediaUpdate(ownerType, ownerId);

  return media;
};

module.exports.uploadMultipartMany = async function(body, files, req) {
  var ownerType = body.ownerType;
  var ownerId = body.ownerId;
  var medias = [];
  var index;
  var file;
  var media;

  if (!ownerType || !ownerId || !files || files.length === 0) {
    throw createControllerError('ownerType, ownerId and files are required', 400);
  }

  for (index = 0; index < files.length; index += 1) {
    file = files[index];
    media = await createMediaFromLocalFile({
      req: req,
      ownerType: ownerType,
      ownerId: ownerId,
      filePath: file.path,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      isPrimary: index === 0,
    });
    await syncMediaOwner({ ownerType: ownerType, ownerId: ownerId, media: media });
    medias.push(media);
  }

  await emitMessageMediaUpdate(ownerType, ownerId);

  return medias;
};

module.exports.registerRemoteMedia = async function(body, req) {
  var ownerType = body.ownerType;
  var ownerId = body.ownerId;
  var url = body.url;
  var thumbnailUrl = body.thumbnailUrl;
  var type = body.type || 'image';
  var isPrimary = body.isPrimary || false;
  var media;

  if (!ownerType || !ownerId || !url) {
    throw createControllerError('ownerType, ownerId and url are required', 400);
  }

  media = await Media.create({
    uploader: req.user._id,
    ownerType: ownerType,
    ownerId: ownerId,
    type: type,
    storageProvider: 'remote',
    url: url,
    thumbnailUrl: thumbnailUrl,
    isPrimary: isPrimary,
  });

  await syncMediaOwner({ ownerType: ownerType, ownerId: ownerId, media: media });
  await emitMessageMediaUpdate(ownerType, ownerId);

  return media;
};

module.exports.deleteMedia = async function(mediaId, actor) {
  var media = await Media.findById(mediaId);
  var isOwner;
  var isAdmin;
  var absolutePath;

  if (!media) {
    return false;
  }

  isOwner = String(media.uploader) === String(actor.user && actor.user._id);
  isAdmin = (actor.userRoles || []).indexOf('admin') !== -1;
  if (!isOwner && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }

  if (media.storageProvider === 'local' && String(media.url || '').indexOf('/uploads/') === 0) {
    absolutePath = path.join(__dirname, '..', 'public', media.url);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }

  await unsyncMediaOwner({
    ownerType: media.ownerType,
    ownerId: media.ownerId,
    media: media,
  });
  await emitMessageMediaUpdate(media.ownerType, media.ownerId);
  await media.deleteOne();

  return true;
};
