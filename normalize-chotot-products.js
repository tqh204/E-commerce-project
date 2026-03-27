const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { Product } = require('./schemas');
const { cleanImportedItem } = require('./lib/chototImport');

async function normalizeChototProducts() {
  await connectDB();

  const products = await Product.find({ source: 'chotot' });
  let updated = 0;

  for (const product of products) {
    const cleaned = cleanImportedItem({
      title: product.attributes?.sourceTitle || product.title,
      description: product.description,
      addressText: product.attributes?.rawAddressText || product.addressText,
      sourceUrl: product.sourceUrl,
      price: product.price,
    });

    product.title = cleaned.title;
    product.description = cleaned.description;
    product.province = cleaned.province;
    product.district = cleaned.district;
    product.ward = cleaned.ward;
    product.tags = cleaned.tags;
    product.attributes = {
      ...(product.attributes || {}),
      ...(cleaned.attributes || {}),
    };

    await product.save();
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        updated,
      },
      null,
      2
    )
  );
}

normalizeChototProducts()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
