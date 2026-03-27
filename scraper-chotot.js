const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { importFromChotot } = require('./lib/chototImport');

async function main() {
  await connectDB();

  const categoryUrl = process.argv[2] || 'https://xe.chotot.com/';
  const categoryName = process.argv[3] || 'Vehicles';
  const maxPages = Number(process.argv[4] || 1);
  const mode = process.argv[5] || 'html';
  const keyword = process.argv[6] || '';

  console.log(`Starting Chotot import: ${categoryName} (${categoryUrl})`);

  const result = await importFromChotot({
    categoryUrl,
    categoryName,
    maxPages,
    mode,
    keyword,
  });

  console.log('Chotot import completed.');
  console.log(JSON.stringify(result.summary, null, 2));
  console.log(`Batch ID: ${result.batch._id}`);
}

main()
  .catch((error) => {
    console.error('Chotot import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
