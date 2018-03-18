# Browncoat

A container for testing various app states in orchestration. It aims to 
misbehave in simple ways based on its config so you can ensure your 
orchestration reponds how you want/expect. You can set this Node.js web app to:

1. Have a slow startup
1. Fail startup
1. Exit while running, with error code or without ???
1. Enable or disable Docker healthchecks
1. Fail healthchecks
1. Slow healthchecks

You can configure all these things at setup, and some of them while the 
container is running, via curl

## All startup config options are via environment variables

```
PORT
VERSION
FAIL_STARTUP
DELAY_STARTUP
DELAY_HEALTHCHECK
FAIL_HEALTHCHECK ??
```

## URL's for changing container while it's running

`/fail` = Return 500 and exit the Node process with an error code
`/togglehealthcheck` = By default the healthcheck URL returns 20x. 
Hitting this URL will cause them to start returning 500. 
Hitting it again will return to 20x.
