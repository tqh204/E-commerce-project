const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { Product } = require('./schemas');
const { cleanImportedItem } = require('./lib/chototImport');

async function fixChototProducts() {
  await connectDB();

  const products = await Product.find({ source: 'chotot' });
  let updated = 0;
  let cleanedTitles = 0;
  let repairedImages = 0;

  for (const product of products) {
    const previousTitle = product.title || '';
    const previousThumbnail = product.thumbnailImage || '';
    const previousImageCount = Array.isArray(product.images) ? product.images.length : 0;

    const cleaned = cleanImportedItem({
      title: product.attributes?.sourceTitle || product.title,
      description: product.description,
      addressText: product.attributes?.rawAddressText || product.addressText,
      sourceUrl: product.sourceUrl,
      price: product.price,
      images: product.images,
      thumbnailImage: product.thumbnailImage,
      attributes: product.attributes || {},
    });

    product.title = cleaned.title;
    product.description = cleaned.description;
    product.images = cleaned.images || [];
    product.thumbnailImage = cleaned.thumbnailImage || cleaned.images?.[0] || null;
    product.addressText = cleaned.addressText;
    product.province = cleaned.province;
    product.district = cleaned.district;
    product.ward = cleaned.ward;
    product.condition = ['new', 'like_new', 'good', 'fair', 'poor'].includes(product.condition) ? product.condition : 'good';
    product.tags = cleaned.tags;
    product.attributes = {
      ...(product.attributes || {}),
      ...(cleaned.attributes || {}),
    };

    await product.save();
    updated += 1;

    if (previousTitle !== product.title) {
      cleanedTitles += 1;
    }
    if (
      previousThumbnail !== product.thumbnailImage ||
      previousImageCount !== (product.images || []).length
    ) {
      repairedImages += 1;
    }
  }

  console.log(JSON.stringify({ success: true, updated, cleanedTitles, repairedImages }, null, 2));
}

fixChototProducts()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
