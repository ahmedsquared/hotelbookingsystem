var express = require('express');
var router = express.Router();
var db = require("../db"); //import database

var results = [];

router.get('/payment', async function(req, res) {
  res.render('payment', {title: 'Payment Summary'})
});

/* GET home page. */
//router.get('/', function(req, res, next) {
//  res.render('customer_page', { title: 'Customer Page' });
//});

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

router.get('/search', function(req, res, next) {
  res.render('searchView', { title: 'Search' })
});

router.post('/search', async function(req, res) {
  results = await db.searchRooms(req.body);
  res.render('searchView', { title: 'Search Results', results: results })
});

router.get('/login', async function(req, res){
  res.render('login', {title: 'Login'});
});

router.post('/login', async function(req, res){
  var {username, password, register} = req.body;
  console.log('logging in ...', username);

  if (register){
    await db.register(username, password);
  }else{
    await db.login(username, password);
  }

  req.session.username = username;
  res.redirect('/');
});
router.get('/', async function(req, res){
  var {username} = req.session;
  res.render('index', {
    title: "Account",
    username,
    items: await db.getCustomerRooms(username),
  });
});

router.post('/', async function(req, res){
  var {username} = req.session;

  if (req.body.cancel) {
    await db.cancelBooking(username, req.body.cancel);
  }

  res.redirect('/');
});

router.post('/logout', async function(req, res){
  req.session.username = '';
  res.redirect('/login');
});
module.exports = router;
