var schemas = require('../schemas');

var Role = schemas.Role;

var SYSTEM_ROLES = {
  admin: {
    description: 'Full access to the platform',
    permissions: ['*'],
  },
  user: {
    description: 'Standard marketplace account that can buy, sell, bid, order, and chat',
    permissions: [
      'product:create',
      'product:update',
      'product:read',
      'order:create',
      'order:read',
      'bid:create',
      'auction:create',
      'chat:create',
      'chat:read',
    ],
  },
};

var ensureSystemRoles = async function() {
  var roleNames = Object.keys(SYSTEM_ROLES);
  var index;
  var name;
  var roles;
  var accumulator = {};

  await Promise.all(
    roleNames.map(function(roleName) {
      return Role.findOneAndUpdate(
        { name: roleName },
        {
          $set: {
            name: roleName,
            description: SYSTEM_ROLES[roleName].description,
            permissions: SYSTEM_ROLES[roleName].permissions,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    })
  );

  roles = await Role.find({ name: { $in: roleNames } });
  for (index = 0; index < roles.length; index += 1) {
    name = roles[index].name;
    accumulator[name] = roles[index];
  }

  return accumulator;
};

module.exports = {
  SYSTEM_ROLES: SYSTEM_ROLES,
  ensureSystemRoles: ensureSystemRoles,
};
