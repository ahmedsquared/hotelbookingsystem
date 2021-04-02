var express = require('express');
var router = express.Router();
var db = require('../db');

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

function ensureLoggedIn(req, res, next){
  if (!req.session.username){
    res.redirect('/login');
  } else {
    next();
  }
}

router.use(ensureLoggedIn);

router.get('/', async function(req, res){
  var {username} = req.session;
  res.render('index', {title: "Account", username});
});

module.exports = router;
