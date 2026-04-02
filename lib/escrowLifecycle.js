const { EscrowTransaction, Order } = require('../schemas');
const { releaseEscrowToSeller } = require('./escrowService');

let lifecycleTimer = null;
let lifecycleRunPromise = null;

const processDueEscrows = async () => {
  const dueEscrows = await EscrowTransaction.find({
    status: 'held',
    autoReleaseAt: { $lte: new Date() },
  });

  const results = [];
  for (const escrow of dueEscrows) {
    try {
      const order = await Order.findById(escrow.order);
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

const runEscrowLifecycleTick = async () => {
  if (lifecycleRunPromise) {
    return lifecycleRunPromise;
  }

  lifecycleRunPromise = (async () => {
    try {
      const releases = await processDueEscrows();
      return { releases };
    } finally {
      lifecycleRunPromise = null;
    }
  })();

  return lifecycleRunPromise;
};

const startEscrowLifecycleMonitor = (intervalMs = 60 * 1000) => {
  if (lifecycleTimer) {
    return lifecycleTimer;
  }

  lifecycleTimer = setInterval(async () => {
    try {
      await runEscrowLifecycleTick();
    } catch (error) {
      console.error('Escrow lifecycle monitor error:', error.message);
    }
  }, intervalMs);

  runEscrowLifecycleTick().catch((error) => {
    console.error('Initial escrow lifecycle error:', error.message);
  });

  if (typeof lifecycleTimer.unref === 'function') {
    lifecycleTimer.unref();
  }

  return lifecycleTimer;
};

module.exports = {
  processDueEscrows,
  runEscrowLifecycleTick,
  startEscrowLifecycleMonitor,
};
