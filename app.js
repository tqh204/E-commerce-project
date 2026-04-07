var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var usersRouter = require('./routes/users');
var addressesRouter = require('./routes/addresses');
var categoriesRouter = require('./routes/categories');
var productsRouter = require('./routes/products');
var ordersRouter = require('./routes/orders');
var auctionsRouter = require('./routes/auctions');
var conversationsRouter = require('./routes/conversations');
var uploadsRouter = require('./routes/uploads');
var importsRouter = require('./routes/imports');
var escrowsRouter = require('./routes/escrows');
var reviewsRouter = require('./routes/reviews');
var walletRouter = require('./routes/wallet');
var notificationsRouter = require('./routes/notifications');

var app = express();

app.use(logger('dev'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.use('/', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/auctions', auctionsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/imports', importsRouter);
app.use('/api/escrows', escrowsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/notifications', notificationsRouter);

app.use(function(req, res) {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(function(error, req, res, next) {
  console.error(error);
  var status = error.status || 500;
  res.status(status).json({
    success: false,
    message: error.message || 'Internal server error',
  });
});

module.exports = app;

