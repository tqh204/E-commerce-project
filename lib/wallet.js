const { User, WalletTransaction } = require('../schemas');

const toAmount = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getAvailableBalance = (user) =>
  Math.max(toAmount(user?.balance) - toAmount(user?.lockedBalance), 0);

const buildWalletTransaction = async ({
  session = null,
  user,
  type,
  direction,
  amount,
  balanceBefore,
  balanceAfter,
  lockedBefore,
  lockedAfter,
  order = null,
  auction = null,
  escrowTransaction = null,
  bid = null,
  description = '',
  metadata = {},
}) =>
  WalletTransaction.create(
    [
      {
        user: user._id || user,
        type,
        direction,
        amount,
        balanceBefore,
        balanceAfter,
        lockedBefore,
        lockedAfter,
        order,
        auction,
        escrowTransaction,
        bid,
        description,
        metadata,
      },
    ],
    session ? { session } : undefined
  );

const loadUserForUpdate = async (userId, session = null) =>
  User.findById(userId).session(session || null);

const ensureSufficientAvailableBalance = (user, amount, message = 'Insufficient wallet balance') => {
  if (getAvailableBalance(user) < amount) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
};

const topUpWallet = async ({ userId, amount, description = '', metadata = {}, session = null }) => {
  const normalizedAmount = toAmount(amount);
  if (normalizedAmount <= 0) {
    const error = new Error('Top up amount must be greater than 0');
    error.status = 400;
    throw error;
  }

  const user = await loadUserForUpdate(userId, session);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const balanceBefore = toAmount(user.balance);
  const lockedBefore = toAmount(user.lockedBalance);
  user.balance = balanceBefore + normalizedAmount;
  await user.save({ session });

  await buildWalletTransaction({
    session,
    user,
    type: 'top_up',
    direction: 'credit',
    amount: normalizedAmount,
    balanceBefore,
    balanceAfter: user.balance,
    lockedBefore,
    lockedAfter: user.lockedBalance,
    description,
    metadata,
  });

  return user;
};

const reserveWalletFunds = async ({
  userId,
  amount,
  description = '',
  metadata = {},
  order = null,
  auction = null,
  bid = null,
  session = null,
}) => {
  const normalizedAmount = toAmount(amount);
  if (normalizedAmount <= 0) {
    const error = new Error('Reserve amount must be greater than 0');
    error.status = 400;
    throw error;
  }

  const user = await loadUserForUpdate(userId, session);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  ensureSufficientAvailableBalance(user, normalizedAmount, 'Insufficient available wallet balance');

  const balanceBefore = toAmount(user.balance);
  const lockedBefore = toAmount(user.lockedBalance);
  user.lockedBalance = lockedBefore + normalizedAmount;
  await user.save({ session });

  await buildWalletTransaction({
    session,
    user,
    type: 'auction_bid_reserve',
    direction: 'lock',
    amount: normalizedAmount,
    balanceBefore,
    balanceAfter: user.balance,
    lockedBefore,
    lockedAfter: user.lockedBalance,
    order,
    auction,
    bid,
    description,
    metadata,
  });

  return user;
};

const releaseWalletReserve = async ({
  userId,
  amount,
  description = '',
  metadata = {},
  order = null,
  auction = null,
  bid = null,
  session = null,
}) => {
  const normalizedAmount = toAmount(amount);
  if (normalizedAmount <= 0) {
    return await loadUserForUpdate(userId, session);
  }

  const user = await loadUserForUpdate(userId, session);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const balanceBefore = toAmount(user.balance);
  const lockedBefore = toAmount(user.lockedBalance);
  user.lockedBalance = Math.max(lockedBefore - normalizedAmount, 0);
  await user.save({ session });

  await buildWalletTransaction({
    session,
    user,
    type: 'auction_bid_release',
    direction: 'unlock',
    amount: normalizedAmount,
    balanceBefore,
    balanceAfter: user.balance,
    lockedBefore,
    lockedAfter: user.lockedBalance,
    order,
    auction,
    bid,
    description,
    metadata,
  });

  return user;
};

const debitWalletFunds = async ({
  userId,
  amount,
  type = 'escrow_hold',
  description = '',
  metadata = {},
  order = null,
  auction = null,
  escrowTransaction = null,
  bid = null,
  session = null,
}) => {
  const normalizedAmount = toAmount(amount);
  if (normalizedAmount <= 0) {
    return await loadUserForUpdate(userId, session);
  }

  const user = await loadUserForUpdate(userId, session);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  ensureSufficientAvailableBalance(user, normalizedAmount);

  const balanceBefore = toAmount(user.balance);
  const lockedBefore = toAmount(user.lockedBalance);
  user.balance = Math.max(balanceBefore - normalizedAmount, 0);
  await user.save({ session });

  await buildWalletTransaction({
    session,
    user,
    type,
    direction: 'debit',
    amount: normalizedAmount,
    balanceBefore,
    balanceAfter: user.balance,
    lockedBefore,
    lockedAfter: user.lockedBalance,
    order,
    auction,
    escrowTransaction,
    bid,
    description,
    metadata,
  });

  return user;
};

const consumeWalletReserve = async ({
  userId,
  reservedAmount,
  debitAmount,
  description = '',
  metadata = {},
  order = null,
  auction = null,
  escrowTransaction = null,
  bid = null,
  session = null,
}) => {
  const normalizedReserved = toAmount(reservedAmount);
  const normalizedDebit = toAmount(debitAmount);
  if (normalizedDebit <= 0) {
    const error = new Error('Debit amount must be greater than 0');
    error.status = 400;
    throw error;
  }

  const user = await loadUserForUpdate(userId, session);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const balanceBefore = toAmount(user.balance);
  const lockedBefore = toAmount(user.lockedBalance);
  if (lockedBefore < normalizedReserved || balanceBefore < normalizedDebit) {
    const error = new Error('Insufficient reserved wallet funds');
    error.status = 400;
    throw error;
  }

  user.lockedBalance = Math.max(lockedBefore - normalizedReserved, 0);
  user.balance = Math.max(balanceBefore - normalizedDebit, 0);
  await user.save({ session });

  await buildWalletTransaction({
    session,
    user,
    type: 'escrow_hold',
    direction: 'debit',
    amount: normalizedDebit,
    balanceBefore,
    balanceAfter: user.balance,
    lockedBefore,
    lockedAfter: user.lockedBalance,
    order,
    auction,
    escrowTransaction,
    bid,
    description,
    metadata: { ...metadata, reservedAmount: normalizedReserved },
  });

  return user;
};

const creditWalletFunds = async ({
  userId,
  amount,
  type = 'escrow_release',
  description = '',
  metadata = {},
  order = null,
  auction = null,
  escrowTransaction = null,
  bid = null,
  session = null,
}) => {
  const normalizedAmount = toAmount(amount);
  if (normalizedAmount <= 0) {
    return await loadUserForUpdate(userId, session);
  }

  const user = await loadUserForUpdate(userId, session);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const balanceBefore = toAmount(user.balance);
  const lockedBefore = toAmount(user.lockedBalance);
  user.balance = balanceBefore + normalizedAmount;
  await user.save({ session });

  await buildWalletTransaction({
    session,
    user,
    type,
    direction: 'credit',
    amount: normalizedAmount,
    balanceBefore,
    balanceAfter: user.balance,
    lockedBefore,
    lockedAfter: user.lockedBalance,
    order,
    auction,
    escrowTransaction,
    bid,
    description,
    metadata,
  });

  return user;
};

module.exports = {
  getAvailableBalance,
  ensureSufficientAvailableBalance,
  topUpWallet,
  reserveWalletFunds,
  releaseWalletReserve,
  debitWalletFunds,
  consumeWalletReserve,
  creditWalletFunds,
};
