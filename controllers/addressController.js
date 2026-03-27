const { Address } = require('../schemas');
const { asyncHandler, cleanObject, sendError, sendSuccess } = require('../lib/http');

const unsetOtherDefaults = async (userId, currentId) => {
  await Address.updateMany(
    { user: userId, _id: { $ne: currentId } },
    { $set: { isDefault: false } }
  );
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
  const address = await Address.create({
    user: req.body.userId || req.user._id,
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
    location: req.body.location,
    isDefault: req.body.isDefault,
    notes: req.body.notes,
  });

  if (address.isDefault) {
    await unsetOtherDefaults(address.user, address._id);
  }

  return sendSuccess(res, address, null, 201);
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

  Object.assign(
    address,
    cleanObject({
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
      location: req.body.location,
      isDefault: req.body.isDefault,
      notes: req.body.notes,
    })
  );
  await address.save();

  if (address.isDefault) {
    await unsetOtherDefaults(address.user, address._id);
  }

  return sendSuccess(res, address);
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
  return sendSuccess(res, { deleted: true });
});
