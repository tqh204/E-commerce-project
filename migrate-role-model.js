const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { Role, User } = require('./schemas');
const { ensureSystemRoles } = require('./lib/roles');

async function migrateRoleModel() {
  await connectDB();

  const roles = await ensureSystemRoles();
  const adminRole = roles.admin;
  const userRole = roles.user;

  const oldRoles = await Role.find({ name: { $in: ['buyer', 'seller', 'moderator'] } });
  const oldRoleIds = oldRoles.map((role) => String(role._id));

  const users = await User.find({}).select('_id roles email username');
  let updatedUsers = 0;

  for (const user of users) {
    const currentRoleIds = (user.roles || []).map((roleId) => String(roleId));
    const hasAdmin = currentRoleIds.includes(String(adminRole._id));
    const nextRoles = hasAdmin ? [adminRole._id] : [userRole._id];
    const needsUpdate =
      currentRoleIds.length !== nextRoles.length ||
      currentRoleIds.some((roleId) => !nextRoles.map(String).includes(roleId)) ||
      currentRoleIds.some((roleId) => oldRoleIds.includes(roleId));

    if (needsUpdate) {
      user.roles = nextRoles;
      await user.save();
      updatedUsers += 1;
    }
  }

  const deletedRoles = await Role.deleteMany({ name: { $in: ['buyer', 'seller', 'moderator'] } });

  console.log('Role model migration completed.');
  console.log(`Users updated: ${updatedUsers}`);
  console.log(`Legacy roles removed: ${deletedRoles.deletedCount || 0}`);
  console.log('Active roles: admin, user');
}

migrateRoleModel()
  .catch((error) => {
    console.error('Role model migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
