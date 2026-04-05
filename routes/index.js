var express = require('express');
var path = require('path');
var router = express.Router();

const reactIndex = path.join(__dirname, '..', 'public', 'react-app', 'index.html');
const sendReactApp = function(req, res) {
  res.sendFile(reactIndex);
};

router.get('/react', sendReactApp);

router.get('/', function(req, res) {
  res.sendFile(reactIndex);
});

router.get('*', function(req, res, next) {
  if (req.path.startsWith('/api')) return next();
  if (path.extname(req.path)) return next();
  return sendReactApp(req, res);
});

module.exports = router;
