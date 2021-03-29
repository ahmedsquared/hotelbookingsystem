var express = require('express');
var router = express.Router();
var db = require("../db"); //import database

router.get('/payment', async function(req, res) {
  res.render('payment', {title: 'Payment Summary'})
})
/* GET home page. */
/*router.get('/', function(req, res, next) {
  res.render('payment', { title: 'Hotel Bookings' });
});*/


module.exports = router;
