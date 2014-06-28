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
  CronJob = require('cron').CronJob,
  twilio = require('twilio')(process.env["TWILIO_SID"], process.env["TWILIO_TOKEN"]),
  GitHub = require('github-api');


/*
 * Initiate Express
 */
var app = express()
  , punEnthusiasts = [];


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

  app.use(express.bodyParser());
  app.use(express.favicon());
  app.use(express.logger('dev')); 
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


function getPunEnthusiasts(fn) {
  var github = new GitHub({
    username: process.env["GITHUB_USER"],
    password: process.env["GITHUB_PASSWORD"],
    auth: "basic"
  });
  var gist = github.getGist("5e8c435a88741f73caf5");
  gist.read(function(err, gist) {
    enthusiasts = gist.files["punenthusiasts.json"].content;
    enthusiasts = JSON.parse(enthusiasts);
    fn(err, enthusiasts);
  });
}

getPunEnthusiasts(function(err, enthusiasts) {
  if (err) {
    console.log("[ERROR]: error fetching gist.db; " + err);
  } else {
    punEnthusiasts = enthusiasts;
  }
});

function savePunEnthusiasts(data, fn) {
  var github = new GitHub({
    username: process.env["GITHUB_USER"],
    password: process.env["GITHUB_PASSWORD"],
    auth: "basic"
  });
  var gist = github.getGist("5e8c435a88741f73caf5");
  gist.read(function(err, currentGist) {
    currentGist.files["punenthusiasts.json"].content = JSON.stringify(data, null, 2);
    gist.update(currentGist, function(err, gist) {
      fn(err, gist);
    });
  });
}

// send a pun...
function sendPun(phoneNumber, pun, fn) {
  twilio.sendMessage({
    to: phoneNumber.toString(),
    from: process.env["TWILIO_PHONE"],
    body: pun
  }, function(err, data) {
    fn(err, data);
  });
}

// Get a pun...
function getPun(fn) {
  request('http://www.punoftheday.com/cgi-bin/randompun.pl', function (error, response, body) { 
    if (!error && response.statusCode == 200) {
      $ = cheerio.load(body);
      var rating = true
        , text = $('.dropshadow1').first().text().trim();
      if (!rating) {
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
  console.log("[INFO]: starting. fuse set for " + fuse + " miliseconds");
  setTimeout(function() {
    getPun(function(err, pun) {
      punEnthusiasts.forEach(function(punEnthusiast) {
        sendPun(punEnthusiast.phoneNumber, pun, function(err, rsp) {
          if (err) {
            console.log("[ERROR]: error sending pun to " + punEnthusiast.phoneNumber + ". error: " + err);
          }
        });
      });
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
    punEnthusiasts.push({ phoneNumber: req.body.phone });
    savePunEnthusiasts(punEnthusiasts, function(err, data) {
      if (err) {
        console.log("[ERROR]: error saving punEnthusiasts");
      }
    });
    res.render('success');
  } else {
    res.render('fail', { fact: "The platypus is generally regarded as nocturnal and crepuscular, but individuals are also active during the day, particularly when the sky is overcast."});
  }
});

app.post('/pun', function(req, res) {
  if (req.body.phone) {
    getPun(function(err, pun) {
      sendPun(req.body.phone, pun, function(err, rsp) {
        if (err) {
          res.send({ status: "ERROR", message: "Could not send pun :(" });
        } else {
          res.send({
            status: "OK",
            message: "Pun sent!",
            pun: pun,
            sentAt: rsp.date_created
          });
        }
      });
    });
  } else {
    res.send({ status: "ERROR", message: "You didn't include the `phone` parameter" });
  }
});

app.post('/sms', function(req, res) {
  if (req.body.Body) {
    if (req.body.Body.toLowerCase()=="stop") {
      punEnthusiasts = punEnthusiasts.filter(function(punEnthusiast) {
      if (req.body.From.indexOf(punEnthusiast.phoneNumber) > -1) {
        return false;
      }
      return true;
      });
      sendPun(req.body.From, "You've been unsubscribed :(", function(err, resp) {
        res.send({ status: "OK" });
      });
    } else if (req.body.Body.toLowerCase()=="stop") {
      getPun(function(err, pun) {
        sendPun(req.body.From, pun, function(err, rsp) {
          if (err) {
            res.send({ status: "ERROR", message: "Could not send pun :(" });
          } else {
            res.send({
              status: "OK",
              message: "Pun sent!",
              pun: pun,
              sentAt: rsp.date_created
            });
          }
        });
      });
    } else {
      res.send({ status: "OK", message: "Not sure what you mean by that" });
    }
  } else {
    res.send({ status: "ERROR", message: "Zer was no body" });
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

app.get('/status', function(req, res) {
  res.send({ status: "OK", data: punEnthusiasts });
});

app.get('*', function(req, res) {
  res.render('404');
});


http.createServer(app).listen(app.get('port'), function() {
  console.log("[INFO]: Express server listening on port " + app.get('port'));
});
