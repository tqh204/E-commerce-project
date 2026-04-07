var schemas = require('../schemas');

var User = schemas.User;
var WalletTransaction = schemas.WalletTransaction;

var toAmount = function(value) {
  var parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

var getAvailableBalance = function(user) {
  var balance = user && user.balance !== undefined ? user.balance : 0;
  var lockedBalance = user && user.lockedBalance !== undefined ? user.lockedBalance : 0;
  return Math.max(toAmount(balance) - toAmount(lockedBalance), 0);
};

var buildWalletTransaction = async function(options) {
  var session = options.session === undefined ? null : options.session;
  var user = options.user;
  var createOptions;

  if (session) {
    createOptions = { session: session };
  }

  return WalletTransaction.create(
    [
      {
        user: user._id || user,
        type: options.type,
        direction: options.direction,
        amount: options.amount,
        balanceBefore: options.balanceBefore,
        balanceAfter: options.balanceAfter,
        lockedBefore: options.lockedBefore,
        lockedAfter: options.lockedAfter,
        order: options.order === undefined ? null : options.order,
        auction: options.auction === undefined ? null : options.auction,
        escrowTransaction:
          options.escrowTransaction === undefined ? null : options.escrowTransaction,
        bid: options.bid === undefined ? null : options.bid,
        description: options.description === undefined ? '' : options.description,
        metadata: options.metadata === undefined ? {} : options.metadata,
      },
    ],
    createOptions
  );
};

var loadUserForUpdate = async function(userId, session) {
  return User.findById(userId).session(session || null);
};

var ensureSufficientAvailableBalance = function(user, amount, message) {
  var error;

  if (getAvailableBalance(user) < amount) {
    error = new Error(message || 'Insufficient wallet balance');
    error.status = 400;
    throw error;
  }
};

var topUpWallet = async function(options) {
  var userId = options.userId;
  var amount = options.amount;
  var description = options.description === undefined ? '' : options.description;
  var metadata = options.metadata === undefined ? {} : options.metadata;
  var session = options.session === undefined ? null : options.session;
  var normalizedAmount = toAmount(amount);
  var user;
  var balanceBefore;
  var lockedBefore;
  var error;

  if (normalizedAmount <= 0) {
    error = new Error('Top up amount must be greater than 0');
    error.status = 400;
    throw error;
  }

  user = await loadUserForUpdate(userId, session);
  if (!user) {
    error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  balanceBefore = toAmount(user.balance);
  lockedBefore = toAmount(user.lockedBalance);
  user.balance = balanceBefore + normalizedAmount;
  await user.save({ session: session });

  await buildWalletTransaction({
    session: session,
    user: user,
    type: 'top_up',
    direction: 'credit',
    amount: normalizedAmount,
    balanceBefore: balanceBefore,
    balanceAfter: user.balance,
    lockedBefore: lockedBefore,
    lockedAfter: user.lockedBalance,
    description: description,
    metadata: metadata,
  });

  return user;
};

var reserveWalletFunds = async function(options) {
  var userId = options.userId;
  var amount = options.amount;
  var description = options.description === undefined ? '' : options.description;
  var metadata = options.metadata === undefined ? {} : options.metadata;
  var order = options.order === undefined ? null : options.order;
  var auction = options.auction === undefined ? null : options.auction;
  var bid = options.bid === undefined ? null : options.bid;
  var session = options.session === undefined ? null : options.session;
  var normalizedAmount = toAmount(amount);
  var user;
  var balanceBefore;
  var lockedBefore;
  var error;

  if (normalizedAmount <= 0) {
    error = new Error('Reserve amount must be greater than 0');
    error.status = 400;
    throw error;
  }

  user = await loadUserForUpdate(userId, session);
  if (!user) {
    error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  ensureSufficientAvailableBalance(user, normalizedAmount, 'Insufficient available wallet balance');

  balanceBefore = toAmount(user.balance);
  lockedBefore = toAmount(user.lockedBalance);
  user.lockedBalance = lockedBefore + normalizedAmount;
  await user.save({ session: session });

  await buildWalletTransaction({
    session: session,
    user: user,
    type: 'auction_bid_reserve',
    direction: 'lock',
    amount: normalizedAmount,
    balanceBefore: balanceBefore,
    balanceAfter: user.balance,
    lockedBefore: lockedBefore,
    lockedAfter: user.lockedBalance,
    order: order,
    auction: auction,
    bid: bid,
    description: description,
    metadata: metadata,
  });

  return user;
};

var releaseWalletReserve = async function(options) {
  var userId = options.userId;
  var amount = options.amount;
  var description = options.description === undefined ? '' : options.description;
  var metadata = options.metadata === undefined ? {} : options.metadata;
  var order = options.order === undefined ? null : options.order;
  var auction = options.auction === undefined ? null : options.auction;
  var bid = options.bid === undefined ? null : options.bid;
  var session = options.session === undefined ? null : options.session;
  var normalizedAmount = toAmount(amount);
  var user;
  var balanceBefore;
  var lockedBefore;
  var error;

  if (normalizedAmount <= 0) {
    return loadUserForUpdate(userId, session);
  }

  user = await loadUserForUpdate(userId, session);
  if (!user) {
    error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  balanceBefore = toAmount(user.balance);
  lockedBefore = toAmount(user.lockedBalance);
  user.lockedBalance = Math.max(lockedBefore - normalizedAmount, 0);
  await user.save({ session: session });

  await buildWalletTransaction({
    session: session,
    user: user,
    type: 'auction_bid_release',
    direction: 'unlock',
    amount: normalizedAmount,
    balanceBefore: balanceBefore,
    balanceAfter: user.balance,
    lockedBefore: lockedBefore,
    lockedAfter: user.lockedBalance,
    order: order,
    auction: auction,
    bid: bid,
    description: description,
    metadata: metadata,
  });

  return user;
};

var debitWalletFunds = async function(options) {
  var userId = options.userId;
  var amount = options.amount;
  var type = options.type === undefined ? 'escrow_hold' : options.type;
  var description = options.description === undefined ? '' : options.description;
  var metadata = options.metadata === undefined ? {} : options.metadata;
  var order = options.order === undefined ? null : options.order;
  var auction = options.auction === undefined ? null : options.auction;
  var escrowTransaction =
    options.escrowTransaction === undefined ? null : options.escrowTransaction;
  var bid = options.bid === undefined ? null : options.bid;
  var session = options.session === undefined ? null : options.session;
  var normalizedAmount = toAmount(amount);
  var user;
  var balanceBefore;
  var lockedBefore;
  var error;

  if (normalizedAmount <= 0) {
    return loadUserForUpdate(userId, session);
  }

  user = await loadUserForUpdate(userId, session);
  if (!user) {
    error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  ensureSufficientAvailableBalance(user, normalizedAmount);

  balanceBefore = toAmount(user.balance);
  lockedBefore = toAmount(user.lockedBalance);
  user.balance = Math.max(balanceBefore - normalizedAmount, 0);
  await user.save({ session: session });

  await buildWalletTransaction({
    session: session,
    user: user,
    type: type,
    direction: 'debit',
    amount: normalizedAmount,
    balanceBefore: balanceBefore,
    balanceAfter: user.balance,
    lockedBefore: lockedBefore,
    lockedAfter: user.lockedBalance,
    order: order,
    auction: auction,
    escrowTransaction: escrowTransaction,
    bid: bid,
    description: description,
    metadata: metadata,
  });

  return user;
};

var consumeWalletReserve = async function(options) {
  var userId = options.userId;
  var reservedAmount = options.reservedAmount;
  var debitAmount = options.debitAmount;
  var description = options.description === undefined ? '' : options.description;
  var metadata = options.metadata === undefined ? {} : options.metadata;
  var order = options.order === undefined ? null : options.order;
  var auction = options.auction === undefined ? null : options.auction;
  var escrowTransaction =
    options.escrowTransaction === undefined ? null : options.escrowTransaction;
  var bid = options.bid === undefined ? null : options.bid;
  var session = options.session === undefined ? null : options.session;
  var normalizedReserved = toAmount(reservedAmount);
  var normalizedDebit = toAmount(debitAmount);
  var user;
  var balanceBefore;
  var lockedBefore;
  var error;
  var nextMetadata = {};
  var key;

  if (normalizedDebit <= 0) {
    error = new Error('Debit amount must be greater than 0');
    error.status = 400;
    throw error;
  }

  user = await loadUserForUpdate(userId, session);
  if (!user) {
    error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  balanceBefore = toAmount(user.balance);
  lockedBefore = toAmount(user.lockedBalance);
  if (lockedBefore < normalizedReserved || balanceBefore < normalizedDebit) {
    error = new Error('Insufficient reserved wallet funds');
    error.status = 400;
    throw error;
  }

  user.lockedBalance = Math.max(lockedBefore - normalizedReserved, 0);
  user.balance = Math.max(balanceBefore - normalizedDebit, 0);
  await user.save({ session: session });

  for (key in metadata) {
    if (Object.prototype.hasOwnProperty.call(metadata, key)) {
      nextMetadata[key] = metadata[key];
    }
  }
  nextMetadata.reservedAmount = normalizedReserved;

  await buildWalletTransaction({
    session: session,
    user: user,
    type: 'escrow_hold',
    direction: 'debit',
    amount: normalizedDebit,
    balanceBefore: balanceBefore,
    balanceAfter: user.balance,
    lockedBefore: lockedBefore,
    lockedAfter: user.lockedBalance,
    order: order,
    auction: auction,
    escrowTransaction: escrowTransaction,
    bid: bid,
    description: description,
    metadata: nextMetadata,
  });

  return user;
};

var creditWalletFunds = async function(options) {
  var userId = options.userId;
  var amount = options.amount;
  var type = options.type === undefined ? 'escrow_release' : options.type;
  var description = options.description === undefined ? '' : options.description;
  var metadata = options.metadata === undefined ? {} : options.metadata;
  var order = options.order === undefined ? null : options.order;
  var auction = options.auction === undefined ? null : options.auction;
  var escrowTransaction =
    options.escrowTransaction === undefined ? null : options.escrowTransaction;
  var bid = options.bid === undefined ? null : options.bid;
  var session = options.session === undefined ? null : options.session;
  var normalizedAmount = toAmount(amount);
  var user;
  var balanceBefore;
  var lockedBefore;
  var error;

  if (normalizedAmount <= 0) {
    return loadUserForUpdate(userId, session);
  }

  user = await loadUserForUpdate(userId, session);
  if (!user) {
    error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  balanceBefore = toAmount(user.balance);
  lockedBefore = toAmount(user.lockedBalance);
  user.balance = balanceBefore + normalizedAmount;
  await user.save({ session: session });

  await buildWalletTransaction({
    session: session,
    user: user,
    type: type,
    direction: 'credit',
    amount: normalizedAmount,
    balanceBefore: balanceBefore,
    balanceAfter: user.balance,
    lockedBefore: lockedBefore,
    lockedAfter: user.lockedBalance,
    order: order,
    auction: auction,
    escrowTransaction: escrowTransaction,
    bid: bid,
    description: description,
    metadata: metadata,
  });

  return user;
};

module.exports = {
  getAvailableBalance: getAvailableBalance,
  ensureSufficientAvailableBalance: ensureSufficientAvailableBalance,
  topUpWallet: topUpWallet,
  reserveWalletFunds: reserveWalletFunds,
  releaseWalletReserve: releaseWalletReserve,
  debitWalletFunds: debitWalletFunds,
  consumeWalletReserve: consumeWalletReserve,
  creditWalletFunds: creditWalletFunds,
};
