var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  var imageNumber = Math.floor(Math.random()*(6)+1);
  res.render('index', { title: 'browncoats', image: imageNumber });
});

module.exports = router;
