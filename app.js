const express      = require('express');
const path         = require('path');
const favicon      = require('serve-favicon');
const logger       = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser   = require('body-parser');
const yn           = require('yn');
const stoppable    = require('stoppable');

// pull in environment settings before we startup the web server
const PORT                  = parseInt(process.env.PORT, 10) || 8000;
const app                   = express();
app.locals.version          = process.env.VERSION || 'v1';
app.locals.failstartup      = yn(process.env.FAIL_STARTUP, {default: false});
app.locals.delaystartup     = parseInt(process.env.DELAY_STARTUP, 10) || 0;
app.locals.delayhealthcheck = parseInt(process.env.DELAY_HEALTHCHECK, 10) || 0;
app.locals.happyhealthcheck = yn(process.env.HAPPYHEALTHCHECK, {default: true});
app.locals.enablelogger     = yn(process.env.ENABLE_LOGGER, {default: true});
var server; // because we need higher scope later

// pull in routes
var index = require('./routes/index');

// standard express startup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
if (app.locals.enablelogger) {
  app.use(logger('dev'));
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// define routes with views
app.use('/', index);

//
// other routes that have no views, just middleware
//

// kill node if we hit this URL
app.get('/fail', function (req, res) {
  res.status(500);
  var message = `OK we'll now process.exit() with error code 1`;
  console.error(message);
  res.send(message);
  process.exit(1);
});

// start failing healthcheck if we hit this URL
app.get('/togglehealthcheck', function (req, res) {
  app.locals.happyhealthcheck = !app.locals.happyhealthcheck;
  console.info(`Happy Healthcheck is now set to ${app.locals.happyhealthcheck}`); 
  res.send(getSettings());
});

// to easily distinquish between versions while httping, we'll send a different status code for great demos
app.get('/healthz', function (req, res) {
  if (app.locals.enablelogger) {
    console.info(`Happy Healthcheck is ${app.locals.happyhealthcheck}`);
  }
  if (!app.locals.happyhealthcheck) {
    res.status(500);
  } else if (app.locals.version == 'v1') {
    res.status(201);
  } else if (app.locals.version == 'v2') {
    res.status(202);
  } else if (app.locals.version == 'v3') {
    res.status(203);
  }
 
  // delay the healthcheck response to simulate app under load
  setTimeout(function () {
    res.setHeader('Content-Type', 'application/json');
    res.send(getSettings());
  }, app.locals.delayhealthcheck)
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// return current settings values
function getSettings() {
  var settings = JSON.stringify({
      version: app.locals.version,
      happyhealthcheck: app.locals.happyhealthcheck,
      failstartup: app.locals.failstartup,
      delaystartup: app.locals.delaystartup,
      delayhealthcheck: app.locals.delayhealthcheck
    });
  return settings;
}

// put startup pause here to simulate apps that have long startup
function waitBeforeStart() {
  if (app.locals.failstartup) {
    console.error(`Oh now FAIL_STARTUP is true so now Ima crashin'`);
   	process.exit(1);
  }
  console.info(`Begining ${app.locals.delaystartup} millisecond startup`);
  setTimeout(function () {
    startServer();
  }, app.locals.delaystartup);
}

// startup web server
function startServer() {
  server = stoppable(app.listen(PORT, function () {
    console.info(`Webserver is ready\n${getSettings()}`);
  }), 3000);
}

// quit on ctrl-c when running docker in terminal
process.on('SIGINT', function onSigint () {
  console.info('Got SIGINT (aka ctrl-c in docker). Graceful shutdown ', new Date().toISOString());
  shutdown();
})

// quit properly on docker stop
process.on('SIGTERM', function onSigterm () {
  console.info('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString());
  shutdown();
})

// gracefully shut down server
function shutdown() {
  server.stop(function onServerClosed (err) {
    if (err) {
      console.error(err);
      process.exitCode = 1;
    }
    process.exit();
  }); //decorated by stoppable module to handle keep alives
  
}
//
// need above in docker container to properly exit
//

// lets do this
waitBeforeStart();
