# Browncoat 🚀🤠 - it [aims to misbehave](https://www.youtube.com/watch?v=1VR3Av9qfZc)

A container for testing various app states in orchestration. It aims to 
misbehave in simple ways based on its config so you can ensure your 
orchestration reponds how you want/expect. You can set this Node.js web app to:

1. Have a slow startup
1. Fail startup
1. Exit while running, with error code
1. Enable or disable Docker healthchecks
1. Fail healthchecks
1. Slow healthchecks
1. Responds with a different 20x HTTP status code for different image tags (versions)

You can configure all these things at setup/runtime via envvars, and some of them while the 
container is running, via specific routes (URLs).

## Image tags

The app code is the same in all images, but they do have different default envvars set and ones
marked healthcheck will have a HEALTHCHECK set in Dockerfile. You can override the envvars listed 
later at runtime to make any image act differently, but these images are provided for doing basic
container update testing, and then you can build on them with runtime envvar settings. Healthcheck 
HTTP Codes are different per version to make container update identification easier when using httping
or similar tool.

|Image|Version|Healcheck|/healthz HTTP Code|Note|
|---|---|---|---|---|
|bretfisher/browncoat:latest|v1|False|201|Identical to v1|
|bretfisher/browncoat:v1|v1|False|201|   |
|bretfisher/browncoat:v2|v2|False|202|  |
|bretfisher/browncoat:v3|v3|False|203|Fails on start|
|bretfisher/browncoat:healthcheck|v1|True|201|   |
|bretfisher/browncoat:v2.healthcheck|v2|True|202|   |
|bretfisher/browncoat:v3.healthcheck|v3|True|203|Healthcheck returns 500|

## Examples with Docker Run

- `docker run -p 80:80 --env DELAY_STARTUP=5000 bretfisher/browncoat:v1` - Start the v1 image
with a slow startup of 5 seconds (Node will wait 5s before listening on the port). This is useful
to simulate apps that take more time to startup, and also simulate distrubted environments 
where not all things start in "proper" order.
- `docker run -p 80:80 --env FAIL_STARTUP=true bretfisher/browncoat:v2` - Start the v2 image and cause
it to exit with an error code. Simulate what would happen if you didn't test proper running of a 
container in CI and something was set wrong when you deployed container. Do you systems catch this type
of quick failure that may not show up in unit tests. Note `bretfisher/browncoat:v3` does this by default.

Note: `docker run` doesn't react to failed healthchecks.


## Examples with Swarm Services

This is where things get fun.

1. `docker service create --name firefly -p 80:80 --replicas 3 bretfisher/browncoat` - Create a three-container
service that doesn't have a Dockerfile healthcheck built in.
1. Install httping to monitor the health endpoint `/healthz` with something like 
`httping -i .1 -GsY localhost/healthz`. You can also run it from a container: 
`docker run --rm bretfisher/httping -i .1 -GsY <hostIP>/healthz`. Notice you get a 201 response code. v2 
will have a 202 response code to make it easier to identiy how updates are distributing connections.
1. `docker service update --image bretfisher/browncoat:v2 firefly`. Notice some connections will fail. This is 
normal without a healthcheck. Docker has no awareness of if you're container is trully "ready" for connections and 
starts sending them to new containers before app is listening. This gets worse as your `DELAY_STARTUP` increases.
1. `docker service update --image bretfisher/browncoat:healthcheck firefly`. This time you should have zero
connection failures. The new image has HEALTHCHECK command in it, so Swarm uses it to wait for ready state.

Note: Lots more options you could do here to test various Swarm reactions to issues... read on!

## Examples with Kubernetes

Would happyly accept a PR!

## All startup config options are via environment variables

- `PORT` - int, port to listen on, defaults to 80
- `VERSION` - string, doesn't change the functionanlity, but used to create different images for update testing
- `FAIL_STARTUP` - true/false, exit(1) right at start
- `DELAY_STARTUP` - int, set to milliseconds the app will wait before listening on PORT
- `DELAY_HEALTHCHECK` - int, set to milliseconds the app will wait before responding on /healthz
- `HAPPYHEALTHCHECK` - true/false, false will cause /healthz to return 500, defaults to true on v1/v2, false on v3
- `ENABLE_LOGGER` - true/false, defaults to true, logs all HTTP requests to stdout

## Useful routes (URLs)

- `/` - Returns a random image of Serenity crew.

- `/healthz` - Returns JSON of environment variables. Returns 500 if `HAPPYHEALTHCHECK` is false.
Returns a 20x if true. Actual status code matches the version of app running. This is useful for using 
tools like httping to test connectivity while doing rolling or blue/green updates and being able to see
which is responding.
  - 201 - v1
  - 202 - v2
  - 203 - v3

- `/fail` - Returns 500 and exits the Node process with an error code.

- `/togglehealthcheck` = By default the healthcheck URL returns 20x. 
Hitting this URL will cause them to start returning 500. 
Hitting it again will return to 20x.

## This is a Node.js app using [Express](https://expressjs.com/) for easier http servering 
and [Stoppable](https://github.com/hunterloftis/stoppable) for better graceful shutdowns.
