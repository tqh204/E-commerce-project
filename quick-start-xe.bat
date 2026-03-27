@echo off
Rem Quick Start - Scrape Xe Chotot (Windows)

cls
echo.
echo 🚗 Xe Chotot Scraper - Quick Start
echo ==================================
echo.

Rem Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js không được cài đặt
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js: %NODE_VERSION%
echo.

echo 📦 Checking dependencies...
echo.

Rem Check if node_modules exist
if not exist "node_modules" (
    echo 📥 Installing npm packages...
    call npm install
    echo.
)

echo.
echo 🚀 Ready to scrape!
echo.
echo Chọn một lệnh để chạy:
echo.
echo 1️⃣  Scrape Xe Chotot (Cheerio - nhanh):
echo    node scraper-xe-chotot.js
echo.
echo 2️⃣  Scrape Xe Chotot (Puppeteer - an toàn):
echo    npm install puppeteer
echo    node scraper-chotot-puppeteer.js
echo.
echo 3️⃣  Demo với dữ liệu sample:
echo    node seed-data.js
echo.
echo 4️⃣  Xem dữ liệu trong MongoDB:
echo    mongosh
echo    ^> db.products.find().limit(5)
echo.
echo 5️⃣  Import Chotot (categories):
echo    node scraper-chotot.js
echo.
pause
