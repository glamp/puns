/* 
 * Dependencies
 */
var express = require('express'),
  path = require('path'),
  fs = require('fs'),
  http = require('http'),
  exphbs = require('express3-handlebars'),
  lessMiddleware = require('less-middleware'),
  request = require('request'),
  cheerio = require('cheerio'),
  time = require('time'),
  CronJob = require('cron').CronJob;;


/*
 * Initiate Express
 */
var app = express()
  , punPeople = [];


/* 
 * App Configurations
 */
app.configure(function() {
  app.set('port', process.env.PORT || 5000);

  app.set('views', __dirname + '/views');

  app.set('view engine', 'html');
  app.engine('html', exphbs({
    defaultLayout: 'main',
    extname: '.html'
    //helpers: helpers
  }));
  app.enable('view cache');

  app.use(lessMiddleware({
    src: __dirname + '/public',
    compress: true,
    sourceMap: true
  }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(express.favicon());
  app.use(express.logger('dev')); 
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});



// Get a pun...
function getPun(fn) {
  request('http://www.punoftheday.com/cgi-bin/randompun.pl', function (error, response, body) { 
    if (!error && response.statusCode == 200) {
      $ = cheerio.load(body);
      var rating = true
        , text = $('.dropshadow1').first().text().trim();
      if (! rating) {
        getPun(fn);
      } else {
        fn(null, text);
      }
    } else {
      fn(error, null);
    }
  })
}

var letsPun = new CronJob('* * 9 * * *', function() {
  var fuse = Math.random()*5*60*60*1000;
  console.log("starting. fuse set for " + fuse + " miliseconds");
  setTimeout(function() {
    getPun(function(err, pun) {
      console.log(pun);
      /* 
       * punPeople.forEach(punPerson) {
       *   sendPun(punPerson.phoneNumber, pun);
       * });
       */
    });
  }, fuse);
}, null, true, "America/New_York");

// let the punning...begin!!!
letsPun.start();

/*
* Routes for Index
*/
app.get('/', function(req, res) {
  res.render('index');
});

app.post('/', function(req, res) {
  if (req.body.phone) {
    punPeople.push({ phoneNumber: req.body.phone });
    res.render('success');
  } else {
    res.render('fail', { fact: "The platypus is generally regarded as nocturnal and crepuscular, but individuals are also active during the day, particularly when the sky is overcast."});
  }
});


/*
 * Routes for Robots/404
 */
app.get('/robots.txt', function(req, res) {
  fs.readFile(__dirname + "/robots.txt", function(err, data) {
    res.header('Content-Type', 'text/plain');
    res.send(data);
  });
});

app.get('*', function(req, res) {
  res.render('404');
});


http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});
