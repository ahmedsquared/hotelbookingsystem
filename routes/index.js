var express = require('express');
var router = express.Router();
var db = require("../db"); //import database

router.get('/payment', async function(req, res) {
  res.render('payment', {title: 'Payment Summary'})
});

/* GET home page. */
/*router.get('/', function(req, res, next) {
  res.render('payment', { title: 'Hotel Bookings' });
});*/

router.post('/payment', async function(req, res){
  //pull variables from request, if don't exist, undefined
  var { username, credit_num, csv, pay } = req.body;
  console.log('paying now ...', credit_num);

  //Check for pay or back button pressed
  if (pay) {
    await db.add_payment_info(username, credit_num, csv)
  }
  else {
    //code to go back to previous screen
  }

  //store pulled username into session that is hooked up to a cookie
  req.session.username = username;
  //Take me back to main page
  res.redirect('/payment');
});

module.exports = router;
