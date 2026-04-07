var schemas = require('../schemas');
var httpLib = require('../lib/http');

var Address = schemas.Address;
var User = schemas.User;
var cleanObject = httpLib.cleanObject;

var createControllerError = function(message, status, details) {
  var error = new Error(message);
  error.status = status || 400;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

var normalizeLocation = function(payload) {
  var locationPayload = payload || {};
  var coordinates = locationPayload.coordinates;
  var normalizedCoordinates;
  var lng;
  var lat;

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return undefined;
  }

  normalizedCoordinates = coordinates.map(Number);
  lng = normalizedCoordinates[0];
  lat = normalizedCoordinates[1];
  if (Number.isNaN(lng) || Number.isNaN(lat)) {
    return undefined;
  }

  return {
    type: 'Point',
    coordinates: [lng, lat],
  };
};

var unsetOtherDefaults = async function(userId, currentId) {
  await Address.updateMany(
    { user: userId, _id: { $ne: currentId } },
    { $set: { isDefault: false } }
  );
};

var syncDefaultAddress = async function(userId, preferredAddressId) {
  var targetAddressId = preferredAddressId === undefined ? null : preferredAddressId;
  var defaultAddress = null;

  if (targetAddressId) {
    defaultAddress = await Address.findOne({ _id: targetAddressId, user: userId });
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

var canManageAddress = function(address, actor) {
  return String(address.user) === String(actor.user && actor.user._id) ||
    (actor.userRoles || []).indexOf('admin') !== -1;
};

module.exports.listAddresses = async function(actor, query) {
  var filter = (actor.userRoles || []).indexOf('admin') !== -1 && query && query.userId
    ? { user: query.userId }
    : { user: actor.user._id };

  return Address.find(filter).sort({ isDefault: -1, createdAt: -1 });
};

module.exports.getAddressById = async function(addressId, actor) {
  var address = await Address.findById(addressId);

  if (!address) {
    return null;
  }
  if (!canManageAddress(address, actor)) {
    throw createControllerError('Forbidden', 403);
  }

  return address;
};

module.exports.createAddress = async function(body, actor) {
  var isAdmin = (actor.userRoles || []).indexOf('admin') !== -1;
  var userId;
  var address;
  var owner;

  if (body.userId && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }

  userId = body.userId || actor.user._id;
  address = await Address.create({
    user: userId,
    label: body.label,
    fullName: body.fullName,
    phone: body.phone,
    countryCode: body.countryCode,
    country: body.country,
    province: body.province,
    district: body.district,
    ward: body.ward,
    street: body.street,
    fullAddress: body.fullAddress,
    postalCode: body.postalCode,
    location: normalizeLocation(body.location),
    isDefault: body.isDefault,
    notes: body.notes,
  });

  if (address.isDefault) {
    await syncDefaultAddress(address.user, address._id);
  } else {
    owner = await User.findById(address.user).select('defaultAddress');
    if (!owner || !owner.defaultAddress) {
      await syncDefaultAddress(address.user, address._id);
    }
  }

  return Address.findById(address._id);
};

module.exports.updateAddress = async function(addressId, body, actor) {
  var address = await Address.findById(addressId);
  var patch;
  var owner;

  if (!address) {
    return null;
  }
  if (!canManageAddress(address, actor)) {
    throw createControllerError('Forbidden', 403);
  }

  patch = cleanObject({
    label: body.label,
    fullName: body.fullName,
    phone: body.phone,
    countryCode: body.countryCode,
    country: body.country,
    province: body.province,
    district: body.district,
    ward: body.ward,
    street: body.street,
    fullAddress: body.fullAddress,
    postalCode: body.postalCode,
    isDefault: body.isDefault,
    notes: body.notes,
  });
  if (Object.prototype.hasOwnProperty.call(body, 'location')) {
    patch.location = normalizeLocation(body.location) || null;
  }

  Object.assign(address, patch);
  await address.save();

  if (address.isDefault) {
    await syncDefaultAddress(address.user, address._id);
  } else {
    owner = await User.findById(address.user).select('defaultAddress');
    if (owner && owner.defaultAddress && String(owner.defaultAddress) === String(address._id)) {
      await syncDefaultAddress(address.user);
    }
  }

  return Address.findById(address._id);
};

module.exports.deleteAddress = async function(addressId, actor) {
  var address = await Address.findById(addressId);
  var owner;

  if (!address) {
    return false;
  }
  if (!canManageAddress(address, actor)) {
    throw createControllerError('Forbidden', 403);
  }

  await address.deleteOne();
  owner = await User.findById(address.user).select('defaultAddress');
  if (owner && owner.defaultAddress && String(owner.defaultAddress) === String(address._id)) {
    await syncDefaultAddress(address.user);
  }

  return true;
};
