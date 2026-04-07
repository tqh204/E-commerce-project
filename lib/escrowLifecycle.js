var schemas = require('../schemas');
var escrowService = require('./escrowService');

var EscrowTransaction = schemas.EscrowTransaction;
var Order = schemas.Order;
var releaseEscrowToSeller = escrowService.releaseEscrowToSeller;

var lifecycleTimer = null;
var lifecycleRunPromise = null;

var processDueEscrows = async function() {
  var dueEscrows = await EscrowTransaction.find({
    status: 'held',
    autoReleaseAt: { $lte: new Date() },
  });
  var results = [];
  var index;
  var escrow;
  var order;

  for (index = 0; index < dueEscrows.length; index += 1) {
    escrow = dueEscrows[index];
    try {
      order = await Order.findById(escrow.order);
      if (!order) {
        results.push({ escrowId: String(escrow._id), skipped: 'order_not_found' });
        continue;
      }
      await releaseEscrowToSeller(escrow, order, {
        description: 'Escrow auto released after 5 days without buyer response',
      });
      results.push({ escrowId: String(escrow._id), status: 'released' });
    } catch (error) {
      results.push({ escrowId: String(escrow._id), error: error.message });
    }
  }

  return results;
};

var runEscrowLifecycleTick = async function() {
  if (lifecycleRunPromise) {
    return lifecycleRunPromise;
  }

  lifecycleRunPromise = (async function() {
    try {
      var releases = await processDueEscrows();
      return { releases: releases };
    } finally {
      lifecycleRunPromise = null;
    }
  })();

  return lifecycleRunPromise;
};

var startEscrowLifecycleMonitor = function(intervalMs) {
  if (intervalMs === undefined) {
    intervalMs = 60 * 1000;
  }
  if (lifecycleTimer) {
    return lifecycleTimer;
  }

  lifecycleTimer = setInterval(async function() {
    try {
      await runEscrowLifecycleTick();
    } catch (error) {
      console.error('Escrow lifecycle monitor error:', error.message);
    }
  }, intervalMs);

  runEscrowLifecycleTick().catch(function(error) {
    console.error('Initial escrow lifecycle error:', error.message);
  });

  if (typeof lifecycleTimer.unref === 'function') {
    lifecycleTimer.unref();
  }

  return lifecycleTimer;
};

module.exports = {
  processDueEscrows: processDueEscrows,
  runEscrowLifecycleTick: runEscrowLifecycleTick,
  startEscrowLifecycleMonitor: startEscrowLifecycleMonitor,
};
