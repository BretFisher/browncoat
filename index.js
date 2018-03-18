var   express = require('express')
var   morgan  = require('morgan')
const yn      = require('yn')
var   app     = express()

// pull in environment settings before we startup the web server
const PORT              = parseInt(process.env.PORT, 10) || 8000
const VERSION           = process.env.VERSION || 'v0'
const FAIL_STARTUP      = yn(process.env.FAIL_STARTUP, {default: false})
const DELAY_STARTUP     = parseInt(process.env.DELAY_STARTUP, 10) || 0
const DELAY_HEALTHCHECK = parseInt(process.env.DELAY_HEALTHCHECK, 10) || 0
var happyhealthcheck    = yn(process.env.HAPPYHEALTHCHECK, {default: true})
var server

// for console logging of HTTP requests
app.use(morgan('common'))

// default page
app.get('/', function (req, res) {
  res.send(`Hello Docker World\n${getSettings()}`)
})

// to easily distinquish between versions, we'll send a different status code
app.get('/healthz', function (req, res) {
  if (!happyhealthcheck) {
    res.status(500)
  } else if (VERSION == 'v1') {
    res.status(201)
  } else if (VERSION == 'v2') {
    res.status(202)
  } else if (VERSION == 'v3') {
    res.status(203)
  }
  setTimeout(function () {
    res.send(getSettings())
  }, DELAY_HEALTHCHECK)
})

// kill node if we hit this URL
app.get('/fail', function () {
  res.status(500)
  process.exitCode(1)
  res.send(`OK we'll now process.exit()`)
  process.exit()
})

// start failing healthcheck if we hit this URL
app.get('/togglehealthcheck', function (req, res) {
  happyhealthcheck = !happyhealthcheck
  console.log(`Healthcheck Failure set to ${happyhealthcheck}`) 
})

// put startup pause here to simulate apps that have long startup
function waitBeforeStart() {
  if (FAIL_STARTUP) {
   	process.exit()
  }
  console.log(`Begining ${DELAY_STARTUP} millisecond startup`);
  setTimeout(function () {
    startServer()
  }, DELAY_STARTUP)
}

// startup web server
function startServer() {
  server = app.listen(PORT, function () {
    console.log(`Webserver is ready\n${getSettings()}`)
  })
}

// return current settings values
function getSettings() {
  var settings = `  version:${VERSION}
  happy-hc:${happyhealthcheck}
  fail-startup:${FAIL_STARTUP}
  delay-startup:${DELAY_STARTUP}
  delay-hc:${DELAY_HEALTHCHECK}`
  return settings
}

// quit on ctrl-c when running docker in terminal
process.on('SIGINT', function onSigint () {
  console.info('Got SIGINT (aka ctrl-c in docker). Graceful shutdown ', new Date().toISOString())
  shutdown()
})

// quit properly on docker stop
process.on('SIGTERM', function onSigterm () {
  console.info('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString())
  shutdown()
})

// gracefully shut down server
function shutdown() {
  server.close(function onServerClosed (err) {
    if (err) {
      console.error(err)
      process.exitCode = 1
	}
	process.exit()
  })
}
//
// need above in docker container to properly exit
//

waitBeforeStart()
