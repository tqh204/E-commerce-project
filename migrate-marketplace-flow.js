const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { Auction, Product } = require('./schemas');

async function migrateMarketplaceFlow() {
  await connectDB();

  const pendingAuctions = await Auction.find({ status: 'pending_approval' }).select(
    '_id product status startingBid currentBid bidStep reservePrice buyNowPrice'
  );
  let migratedAuctions = 0;
  let syncedAuctionProducts = 0;

  for (const auction of pendingAuctions) {
    auction.status = 'scheduled';
    await auction.save();
    migratedAuctions += 1;

    const product = await Product.findById(auction.product);
    if (!product) continue;

    product.saleType = 'auction';
    product.status = product.status === 'sold' ? 'sold' : 'active';
    product.startingBid = auction.startingBid || product.startingBid || 0;
    product.currentBid = auction.currentBid || auction.startingBid || product.currentBid || 0;
    product.bidStep = auction.bidStep || product.bidStep || 20000;
    product.reservePrice = auction.reservePrice ?? product.reservePrice ?? null;
    product.buyNowPrice = auction.buyNowPrice ?? product.buyNowPrice ?? null;
    product.publishedAt = product.publishedAt || new Date();
    await product.save();
    syncedAuctionProducts += 1;
  }

  const pendingProductsResult = await Product.updateMany(
    { status: 'pending' },
    {
      $set: {
        status: 'active',
        publishedAt: new Date(),
      },
      $unset: {
        soldAt: 1,
      },
    }
  );

  console.log('Marketplace flow migration completed.');
  console.log(`Auctions migrated from pending_approval to scheduled: ${migratedAuctions}`);
  console.log(`Auction products synced: ${syncedAuctionProducts}`);
  console.log(`Products migrated from pending to active: ${pendingProductsResult.modifiedCount || 0}`);
}

migrateMarketplaceFlow()
  .catch((error) => {
    console.error('Marketplace flow migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
