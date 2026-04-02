const { Role } = require('../schemas');

const SYSTEM_ROLES = {
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

const ensureSystemRoles = async () => {
  const roleNames = Object.keys(SYSTEM_ROLES);
  await Promise.all(
    roleNames.map((name) =>
      Role.findOneAndUpdate(
        { name },
        {
          $set: {
            name,
            description: SYSTEM_ROLES[name].description,
            permissions: SYSTEM_ROLES[name].permissions,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );

  const roles = await Role.find({ name: { $in: roleNames } });
  return roles.reduce((accumulator, role) => {
    accumulator[role.name] = role;
    return accumulator;
  }, {});
};

module.exports = {
  SYSTEM_ROLES,
  ensureSystemRoles,
};
