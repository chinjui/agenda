var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("hahaasaaaaaaaaaaa");
  res.render('index', { title: 'Express' });
});
router.get('/temp', function(req, res, next) {
  res.render('temp');
});

module.exports = router;
