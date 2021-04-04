var express = require('express');
var router = express.Router();
var db = require('../db');

var results = [];

/* GET home page. */
router.get('/', function(req, res, next) {
  //res.render('index', { title: 'Express' });
  res.render('customer_page', { title: 'Customer Page' });
});

router.get('/search', function(req, res, next) {
  res.render('searchView', { title: 'Search' })
});

router.post('/search', async function(req, res) {
  results = await db.searchRooms(req.body);
  res.render('searchView', { title: 'Search Results', results: results })
})

module.exports = router;
