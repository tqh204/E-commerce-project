const { Role } = require('../schemas');

const SYSTEM_ROLES = {
  admin: {
    description: 'Full access to the platform',
    permissions: ['*'],
  },
  seller: {
    description: 'Can create and manage listings',
    permissions: ['product:create', 'product:update', 'order:read', 'auction:create'],
  },
  buyer: {
    description: 'Can browse, bid, place orders, and chat',
    permissions: ['product:read', 'order:create', 'bid:create', 'chat:create'],
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
