var express = require('express');
var router = express.Router();
var db = require("../db"); //import database

var results = [];

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

router.get('/bookings', async function(req, res){
  var {username} = req.session;
  res.render('customer_bookings', {
    title: "My Bookings",
    username,
    items: await db.getBookings(username),
  });
});

router.post('/bookings', async function(req, res){
  var {username} = req.session;
  console.log('Cancelling booking');
  if (req.body.cancel) {
    console.log(req.body);
    await db.cancelBooking(req.body.cancel);
  }
  
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



router.get('/add_rooms', async function(req, res){
  res.render('room_addition', {
    title: "Add Rooms",
    items: await db.getAllRooms(),
  });
});

router.post('/add_rooms', async function(req, res, next) {
  await db.addRoom(req.body.numBeds, req.body.bedSize, req.body.roomSize, req.body.hasBalcony, req.body.facesDirection, req.body.basePrice);
  res.render('room_addition', {
    title: "Add Rooms",
    items: await db.getAllRooms(),
  });
});

router.get('/admin_bookings', async function(req, res){
  var {username} = req.session;
  res.render('admin_bookings', {
    title: "All Bookings",
    items: await db.getAllBookings(),
  });
});

router.post('/admin_bookings', async function(req, res){
  console.log('Cancelling booking');
  if (req.body.cancel) {
    await db.cancelBooking(req.body.cancel);
  }
  
  res.render('admin_bookings', {
    title: "All Bookings",
    items: await db.getAllBookings(),
  });
});

router.get('/payment', async function(req, res) {
  //console.log('serviceId', req.session.serviceId);
  price = await db.display_price(req.session.roomId,req.session.days); //req.session.roomId
  service = await db.calc_services(req.session.serviceId,req.session.days);
  subtotal = price + service;
  tax = await db.calc_tax(subtotal);
  total = await db.calc_total(subtotal);
  req.session.totalPrice = total;
  res.render('payment', { title: 'Payment Summary', price: price, subtotal: subtotal, service: service, tax: tax, total: total});
  //res.render('payment', {title: 'Payment Summary'})
});

router.post('/payment', async function(req, res){
  //pull variables from request, if don't exist, undefined
  var { owner, credit_num, csv, exp, pay } = req.body;
  console.log('paying now ...', credit_num);

  //Check for pay or back button pressed
  if (pay) {
    var check = await db.check_payment_info(req.session.username, owner, credit_num, csv, exp, req.session.roomId, req.session.serviceId, req.session.totalPrice, req.session.username, req.session.start, req.session.end, Date.now());
    if (check == 1) {
      //create booking and redirect to user home page
      res.redirect('/customer');
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
  if (req.body.book) {
    console.log(req.body.book);
  }
  else {
    results = await db.searchRooms(req.body);
    req.session.start = req.body.startDate;
    req.session.end = req.body.endDate;
    req.session.startBound = req.body.startDate;
    req.session.endBound = req.body.endDate;
    req.session.search = req.body;
    console.log('req.session.search=  ',req.session.search);
    //console.log('start date : ',req.session.start);
    //console.log('end date: ',req.session.end);
    req.session.days = await db.calc_days(req.session.start, req.session.end);
    //console.log('days: ', req.session.days);
    res.render('searchView', { title: 'Search Results', results: results })
  }
});

router.post('/book_room', async function (req, res) {
  var roomToBookId = req.body.book;
  req.session.roomId = req.body.book;
  console.log('roomId: ', req.session.roomId);
  var availableServices = await db.getServices();
  res.render('chooseServices', {title: 'Choose Services', roomToBookId, availableServices, startBound: req.session.startBound, endBound: req.session.endBound})
})

router.post('/confirm_services', async function (req, res) {
  console.log(req.body);
  var selectedServices = [];
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;
  for (const serviceId in req.body) {
    if (req.body[serviceId] == 'on') {
      selectedServices.push(serviceId);
    }
  }
  req.session.serviceId = selectedServices;
  console.log('Selected Services: ', req.session.serviceId);
  console.log('startDate: ', startDate);
  console.log('endDate: ', endDate);
  res.redirect('/payment');
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

router.post('/to_add', async function(req, res){
  res.redirect('/add_rooms');
});
router.post('/back_admin', async function(req, res){
  res.redirect('/admin');
});

router.post('/to__admin_bookings', async function(req, res){
  res.redirect('/admin_bookings');
});


module.exports = router;
