#!/bin/bash
# Quick Start - Scrape Xe Chotot

echo "🚗 Xe Chotot Scraper - Quick Start"
echo "=================================="
echo ""

# Check Node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js không được cài đặt"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo ""

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB không được cài - Vui lòng cài hoặc dùng MongoDB Atlas"
    echo ""
fi

echo "📦 Checking dependencies..."
echo ""

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "📥 Installing npm packages..."
    npm install
    echo ""
fi

echo "🚀 Ready to scrape!"
echo ""
echo "Chọn một lệnh để chạy:"
echo ""
echo "1️⃣  Scrape Xe Chotot (Cheerio - nhanh):"
echo "   node scraper-xe-chotot.js"
echo ""
echo "2️⃣  Scrape Xe Chotot (Puppeteer - an toàn):"
echo "   npm install puppeteer"
echo "   node scraper-chotot-puppeteer.js"
echo ""
echo "3️⃣  Demo với dữ liệu sample:"
echo "   node seed-data.js"
echo ""
echo "4️⃣  Xem dữ liệu trong MongoDB:"
echo "   mongosh"
echo "   > db.products.find().limit(5)"
echo ""
