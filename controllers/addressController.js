const { Address, User } = require('../schemas');
const { asyncHandler, cleanObject, sendError, sendSuccess } = require('../lib/http');

const normalizeLocation = (payload = {}) => {
  const coordinates = payload?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return undefined;
  }

  const [lng, lat] = coordinates.map(Number);
  if (Number.isNaN(lng) || Number.isNaN(lat)) {
    return undefined;
  }

  return {
    type: 'Point',
    coordinates: [lng, lat],
  };
};

const unsetOtherDefaults = async (userId, currentId) => {
  await Address.updateMany(
    { user: userId, _id: { $ne: currentId } },
    { $set: { isDefault: false } }
  );
};

const syncDefaultAddress = async (userId, preferredAddressId = null) => {
  let defaultAddress = null;

  if (preferredAddressId) {
    defaultAddress = await Address.findOne({ _id: preferredAddressId, user: userId });
  }

  if (!defaultAddress) {
    defaultAddress = await Address.findOne({ user: userId, isDefault: true }).sort({ createdAt: -1 });
  }

  if (!defaultAddress) {
    defaultAddress = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
  }

  if (!defaultAddress) {
    await User.findByIdAndUpdate(userId, { defaultAddress: null });
    return null;
  }

  if (!defaultAddress.isDefault) {
    defaultAddress.isDefault = true;
    await defaultAddress.save();
  }

  await unsetOtherDefaults(userId, defaultAddress._id);
  await User.findByIdAndUpdate(userId, { defaultAddress: defaultAddress._id });
  return defaultAddress;
};

exports.listAddresses = asyncHandler(async (req, res) => {
  const filter = (req.userRoles || []).includes('admin') && req.query.userId
    ? { user: req.query.userId }
    : { user: req.user._id };
  const addresses = await Address.find(filter).sort({ isDefault: -1, createdAt: -1 });
  return sendSuccess(res, addresses);
});

exports.getAddressById = asyncHandler(async (req, res) => {
  const address = await Address.findById(req.params.id);
  if (!address) {
    return sendError(res, 'Address not found', 404);
  }

  const isOwner = String(address.user) === String(req.user._id);
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  return sendSuccess(res, address);
});

exports.createAddress = asyncHandler(async (req, res) => {
  const isAdmin = (req.userRoles || []).includes('admin');
  if (req.body.userId && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  const userId = req.body.userId || req.user._id;
  const address = await Address.create({
    user: userId,
    label: req.body.label,
    fullName: req.body.fullName,
    phone: req.body.phone,
    countryCode: req.body.countryCode,
    country: req.body.country,
    province: req.body.province,
    district: req.body.district,
    ward: req.body.ward,
    street: req.body.street,
    fullAddress: req.body.fullAddress,
    postalCode: req.body.postalCode,
    location: normalizeLocation(req.body.location),
    isDefault: req.body.isDefault,
    notes: req.body.notes,
  });

  if (address.isDefault) {
    await syncDefaultAddress(address.user, address._id);
  } else {
    const owner = await User.findById(address.user).select('defaultAddress');
    if (!owner?.defaultAddress) {
      await syncDefaultAddress(address.user, address._id);
    }
  }

  const hydratedAddress = await Address.findById(address._id);
  return sendSuccess(res, hydratedAddress, null, 201);
});

exports.updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findById(req.params.id);
  if (!address) {
    return sendError(res, 'Address not found', 404);
  }

  const isOwner = String(address.user) === String(req.user._id);
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  const patch = cleanObject({
    label: req.body.label,
    fullName: req.body.fullName,
    phone: req.body.phone,
    countryCode: req.body.countryCode,
    country: req.body.country,
    province: req.body.province,
    district: req.body.district,
    ward: req.body.ward,
    street: req.body.street,
    fullAddress: req.body.fullAddress,
    postalCode: req.body.postalCode,
    isDefault: req.body.isDefault,
    notes: req.body.notes,
  });
  if (Object.prototype.hasOwnProperty.call(req.body, 'location')) {
    patch.location = normalizeLocation(req.body.location) || null;
  }

  Object.assign(address, patch);
  await address.save();

  if (address.isDefault) {
    await syncDefaultAddress(address.user, address._id);
  } else {
    const owner = await User.findById(address.user).select('defaultAddress');
    if (owner?.defaultAddress && String(owner.defaultAddress) === String(address._id)) {
      await syncDefaultAddress(address.user);
    }
  }

  const hydratedAddress = await Address.findById(address._id);
  return sendSuccess(res, hydratedAddress);
});

exports.deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findById(req.params.id);
  if (!address) {
    return sendError(res, 'Address not found', 404);
  }

  const isOwner = String(address.user) === String(req.user._id);
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  await address.deleteOne();
  const owner = await User.findById(address.user).select('defaultAddress');
  if (owner?.defaultAddress && String(owner.defaultAddress) === String(address._id)) {
    await syncDefaultAddress(address.user);
  }
  return sendSuccess(res, { deleted: true });
});
