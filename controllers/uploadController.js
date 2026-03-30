const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Category, Conversation, Media, Message, Product, User } = require('../schemas');
const { emitMessageUpdated } = require('../lib/socket');
const { asyncHandler, sendError, sendSuccess } = require('../lib/http');

const uploadRoot = path.join(__dirname, '..', 'public', 'uploads');
const mimeToExtension = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const ensureUploadDirectory = (targetDir) => {
  fs.mkdirSync(targetDir, { recursive: true });
};

const buildLocalMediaUrl = (relativePath) => `/${relativePath.replace(/\\/g, '/')}`;

const syncMediaOwner = async ({ ownerType, ownerId, media }) => {
  if (ownerType === 'product') {
    const update = {
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

const unsyncMediaOwner = async ({ ownerType, ownerId, media }) => {
  if (ownerType === 'product') {
    const product = await Product.findById(ownerId);
    if (!product) {
      return;
    }

    product.mediaIds = (product.mediaIds || []).filter((id) => String(id) !== String(media._id));
    product.images = (product.images || []).filter((url) => url !== media.url);
    if (product.thumbnailImage === media.url) {
      product.thumbnailImage = product.images[0] || null;
    }
    await product.save();
    return;
  }

  if (ownerType === 'user') {
    const user = await User.findById(ownerId).select('avatarMedia avatarUrl');
    if (!user) {
      return;
    }

    const patch = {};
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
    const message = await Message.findById(ownerId);
    if (!message) {
      return;
    }

    message.attachments = (message.attachments || []).filter(
      (attachmentId) => String(attachmentId) !== String(media._id)
    );
    message.attachmentUrls = (message.attachmentUrls || []).filter((url) => url !== media.url);
    if (!message.attachments.length && message.messageType === 'image') {
      message.messageType = 'text';
    }
    await message.save();
    return;
  }

  if (ownerType === 'category') {
    const category = await Category.findById(ownerId);
    if (!category) {
      return;
    }

    if (category.image === media.url) {
      category.image = '';
      await category.save();
    }
  }
};

const emitMessageMediaUpdate = async (ownerType, ownerId) => {
  if (ownerType !== 'message') {
    return;
  }

  const message = await Message.findById(ownerId)
    .populate('sender', 'username fullName avatarUrl')
    .populate('replyTo', 'content');
  if (!message) {
    return;
  }

  const conversation = await Conversation.findById(message.conversation)
    .populate('participants', 'username fullName avatarUrl')
    .populate('product', 'title thumbnailImage seller');
  if (!conversation) {
    return;
  }

  emitMessageUpdated(conversation, message);
};

const createMediaFromLocalFile = async ({ req, ownerType, ownerId, filePath, fileName, originalName, mimeType, size, isPrimary = false }) => {
  const relativePath = path.relative(path.join(__dirname, '..', 'public'), filePath);
  return Media.create({
    uploader: req.user._id,
    ownerType,
    ownerId,
    type: mimeType.startsWith('image/') ? 'image' : 'file',
    storageProvider: 'local',
    url: buildLocalMediaUrl(relativePath),
    filename: fileName,
    originalName: originalName || fileName,
    mimeType,
    size,
    isPrimary,
  });
};

exports.uploadBase64 = asyncHandler(async (req, res) => {
  const { ownerType, ownerId, fileName, mimeType = 'image/jpeg', base64, isPrimary = false } = req.body;
  if (!ownerType || !ownerId || !base64) {
    return sendError(res, 'ownerType, ownerId and base64 are required', 400);
  }

  const cleaned = String(base64).includes(',') ? String(base64).split(',').pop() : String(base64);
  const extension = mimeToExtension[mimeType] || path.extname(fileName || '').replace('.', '') || 'bin';
  const year = String(new Date().getFullYear());
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const targetDir = path.join(uploadRoot, year, month);
  ensureUploadDirectory(targetDir);

  const generatedName = `${crypto.randomUUID()}.${extension}`;
  const absoluteFilePath = path.join(targetDir, generatedName);
  fs.writeFileSync(absoluteFilePath, Buffer.from(cleaned, 'base64'));

  const media = await createMediaFromLocalFile({
    req,
    ownerType,
    ownerId,
    filePath: absoluteFilePath,
    fileName: generatedName,
    originalName: fileName || generatedName,
    mimeType,
    size: fs.statSync(absoluteFilePath).size,
    isPrimary,
  });

  await syncMediaOwner({ ownerType, ownerId, media });
  await emitMessageMediaUpdate(ownerType, ownerId);

  return sendSuccess(res, media, null, 201);
});

exports.uploadMultipart = asyncHandler(async (req, res) => {
  const { ownerType, ownerId } = req.body;
  const isPrimary = req.body.isPrimary === 'true' || req.body.isPrimary === true;

  if (!ownerType || !ownerId || !req.file) {
    return sendError(res, 'ownerType, ownerId and file are required', 400);
  }

  const media = await createMediaFromLocalFile({
    req,
    ownerType,
    ownerId,
    filePath: req.file.path,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    isPrimary,
  });

  await syncMediaOwner({ ownerType, ownerId, media });
  await emitMessageMediaUpdate(ownerType, ownerId);

  return sendSuccess(res, media, null, 201);
});

exports.uploadMultipartMany = asyncHandler(async (req, res) => {
  const { ownerType, ownerId } = req.body;
  if (!ownerType || !ownerId || !req.files || req.files.length === 0) {
    return sendError(res, 'ownerType, ownerId and files are required', 400);
  }

  const medias = [];
  for (const [index, file] of req.files.entries()) {
    const media = await createMediaFromLocalFile({
      req,
      ownerType,
      ownerId,
      filePath: file.path,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      isPrimary: index === 0,
    });
    await syncMediaOwner({ ownerType, ownerId, media });
    medias.push(media);
  }

  await emitMessageMediaUpdate(ownerType, ownerId);

  return sendSuccess(res, medias, null, 201);
});

exports.registerRemoteMedia = asyncHandler(async (req, res) => {
  const { ownerType, ownerId, url, thumbnailUrl, type = 'image', isPrimary = false } = req.body;
  if (!ownerType || !ownerId || !url) {
    return sendError(res, 'ownerType, ownerId and url are required', 400);
  }

  const media = await Media.create({
    uploader: req.user._id,
    ownerType,
    ownerId,
    type,
    storageProvider: 'remote',
    url,
    thumbnailUrl,
    isPrimary,
  });

  await syncMediaOwner({ ownerType, ownerId, media });
  await emitMessageMediaUpdate(ownerType, ownerId);

  return sendSuccess(res, media, null, 201);
});

exports.deleteMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) {
    return sendError(res, 'Media not found', 404);
  }

  const isOwner = String(media.uploader) === String(req.user._id);
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  if (media.storageProvider === 'local' && media.url.startsWith('/uploads/')) {
    const absolutePath = path.join(__dirname, '..', 'public', media.url);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }

  await unsyncMediaOwner({ ownerType: media.ownerType, ownerId: media.ownerId, media });
  await emitMessageMediaUpdate(media.ownerType, media.ownerId);
  await media.deleteOne();
  return sendSuccess(res, { deleted: true });
});
