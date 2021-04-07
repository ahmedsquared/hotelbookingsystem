var express = require('express');
var router = express.Router();
var db = require("../db"); //import database

var results = [];

router.get('/payment', async function(req, res) {
  res.render('payment', {title: 'Payment Summary'})
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.redirect('/login');
});

//Customer home page 
router.get('/customer', function(req, res, next) {
  var {username} = req.session;
  res.render('customer_home', { title: 'Customer Page' , username });
});

//Customer Bookings
/* router.get('/bookings', function(req, res, next) {
  var {username} = req.session;
  res.render('customer_bookings', { title: 'My Bookings' , username });
}); */

router.get('/bookings', async function(req, res){
  var {username} = req.session;
  res.render('customer_bookings', {
    title: "My Bookings",
    username,
    items: await db.getBookings(username),
  });
});

//Admin home page 
router.get('/admin', function(req, res, next) {
  var {username} = req.session;
  res.render('admin_home', { title: 'Admin Page' , username });
});

router.post('/payment', async function(req, res){
  //pull variables from request, if don't exist, undefined
  var { owner, credit_num, csv, exp, pay } = req.body;
  console.log('paying now ...', credit_num);

  //Check for pay or back button pressed
  if (pay) {
    var check = await db.check_payment_info(req.session.username, owner, credit_num, csv, exp);
    if (check == 1) {
      //create booking and redirect to user home page
      res.redirect('/');
    }
    else {
//res.redirect('/payment');
    }

  }
  else {
    //code to go back to previous screen
  }

  //store pulled username into session that is hooked up to a cookie
  //req.session.username = username;
  //Take me back to main page
  //res.redirect('/payment');
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
  

  if (register){
    await db.register(username, password);
  }else{
    console.log('logging in ...', username);
    await db.login(username, password);
  }

  req.session.username = username;

  if (username == 'Admin'){
    res.redirect('/admin');
  }
  else{
    res.redirect('/customer');
  }
  
});

function ensureLoggedIn(req, res, next){
  console.log('Ensure logged in')
  if (!req.session.username){
    console.log('Not logged in')
    res.redirect('/login');
  }
  else{
    next();
  }
}

router.use(ensureLoggedIn);

router.get('/cust', async function(req, res){
  var {username} = req.session;
  res.render('index', {
    title: "Account",
    username,
    items: await db.getCustomerRooms(username),
  });
});

router.post('/bookings', async function(req, res){
  var {username} = req.session;
  console.log('Cancelling booking')

  if (req.body.cancel) {
    await db.cancelBooking(req.body.cancel);
  }
  
  res.render('customer_bookings', {
    title: "My Bookings",
    username,
    items: await db.getBookings(username),
  });
});

router.post('/logout', async function(req, res){
  delete req.session.username;
  res.redirect('/');
});

router.post('/back_customer', async function(req, res){
  res.redirect('/customer');
});

router.post('/to_bookings', async function(req, res){
  res.redirect('/bookings');
});

router.post('/to_search', async function(req, res){
  res.redirect('/search');
});


module.exports = router;
