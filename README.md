# Browncoat 🚀🤠 - it [aims to misbehave](https://www.youtube.com/watch?v=1VR3Av9qfZc)

A container image for testing various app states in orchestration. It aims to
misbehave in simple ways based on its config so you can ensure your
orchestration responds how you want/expect. You can set this Node.js web app to:

1. Have a slow startup
1. Fail startup
1. Exit while running, with error code
1. Enable or disable Docker healthchecks
1. Fail healthchecks
1. Slow healthchecks
1. Responds with a different 20x HTTP status code for different image tags (versions)

You can configure all these things at setup/runtime via environment variables,
and some of them while the container is running, via specific routes (URLs).

## Image tags

The images are available on [Docker Hub](https://hub.docker.com/r/bretfisher/browncoat)
and [GitHub Container Registry](https://github.com/BretFisher/browncoat/packages).
The app code is the same in all images, but different image tags have different
Dockerfile and env vars set.

Image tags marked healthcheck will have a HEALTHCHECK set in Dockerfile.

HTTP Codes are different per image tag version to make container update
identification easier when using
[httping](https://github.com/BretFisher/httping-docker) or similar tool.

Here's a list of images stored on Docker Hub and how they are different.

|Image|Version|Healcheck|/healthz HTTP Code|Note|
|---|---|---|---|---|
|bretfisher/browncoat:latest|v1|False|201|Identical to v1|
|bretfisher/browncoat:v1|v1|False|201|   |
|bretfisher/browncoat:v2|v2|False|202|  |
|bretfisher/browncoat:v3|v3|False|203|Fails on start|
|bretfisher/browncoat:healthcheck|v1|True|201|   |
|bretfisher/browncoat:v2.healthcheck|v2|True|202|   |
|bretfisher/browncoat:v3.healthcheck|v3|True|203|Healthcheck returns 500|

## Startup config options via environment variables

- `PORT` - int, port to listen on, defaults to 80
- `VERSION` - string, doesn't change the functionality, but used to create different images for update testing
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

## Examples with Docker Run

### Show slow startup

Start the v1 image with a slow startup of 5 seconds (Node will wait 5s before listening
on the port). This is useful to simulate apps that take more time to startup, and also
simulate distributed environments where not all things start in "proper" order.

```shell
docker run -p 80:80 --env DELAY_STARTUP=5000 bretfisher/browncoat:v1
```

You could use [httping](https://github.com/BretFisher/httping-docker) or `curl` to show
how the first 5 seconds of that container running, it doesn't repond to HTTP requests.

### Fail on app startup

Next, start the v2 image and cause it to exit with an error code. This will simulate
what would happen if you didn't test proper running of a container in CI and something
was set wrong when you deployed container. Do you systems catch this type
of quick failure that may not show up in unit tests? Note: `bretfisher/browncoat:v3`
does this startup failure by default.

```shell
docker run -p 80:80 --env FAIL_STARTUP=true bretfisher/browncoat:v2
```

Note: `docker run` and `docker compose` don't react to failed healthchecks like
orchestrators, but they do provide healthcheck status.

## Examples with Swarm

### Create the initial Service

Create a three-container service that doesn't have a Dockerfile healthcheck built in.

```shell
docker service create --name browncoat -p 80:80 --replicas 3 bretfisher/browncoat
```

Next, install httping on your host to monitor the health endpoint `/healthz` with something like
`httping -i .1 -GsY localhost/healthz`. You can also run it from a container:
`docker run --rm bretfisher/httping -i .1 -GsY <hostIP>/healthz`. Notice you get a 201 response code. v2
will have a 202 response code to make it easier to identity how updates are distributing connections.

Now we can update the service with a new image.

```shell
docker service update --image bretfisher/browncoat:v2 browncoat
```

Notice some connections will fail. This is normal without a healthcheck.
Docker has no awareness of if you're container is truly "ready" for connections and
starts sending them to new containers before app is listening. This gets worse as your `DELAY_STARTUP` increases.

Now let's update to another new image. This time you should have zero
connection failures. The new image has HEALTHCHECK command in it, so Swarm uses it to wait for ready state.

```shell
docker service update --image bretfisher/browncoat:healthcheck browncoat
```

Note: this YAML should also work with `docker compose` but it won't replace services, it'll only indicate
the health status with `docker compose ps`. This is useful for using the `depends_on:` + `condition: service_healthy`
to have one service startup wait for another service to be healthy.

## Examples with Kubernetes

Kubernetes ignores Dockerfile `HEALTHCHECK` commands, so you'll need to add them
to your Pod spec. In Kubernetes we have two main checks: livenessProbe and readinessProbe.
A little mnemonic is livenessProbe to check if container is live,
and readinessProbe to check if container is ready to serve traffic
But For more info you can check the
[docs](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes)

### Create the initial Kubernetes Deployment

The below creates a Deployment with 5 pods without
livenessProbe or readinessProbe and a Service to expose the pods.

```shell
kubectl apply -f kubernetes-examples/browncoat-v1.yaml
```

### Causing a rolling update outages due to a lack of probes

Now let's update that Deployment with the default rolling update style.
We will change the container image to `bretfisher/browncoat:v2` and add the
`DELAY_STARTUP` of 5s to simulate a small delay and cause some connection failures
during the rolling update. Probes would have helped prevent connections
from being directed to the new Pod until it was ready. Without probes,
Kubernetes is blind and will start directing Service traffic to the new Pod as
soon as it started.

To follow the rollout use is command in a different window
`kubectl rollout status deploy/browncoat`

To monitor the Service connections, run
[httping](https://github.com/BretFisher/httping-docker) in a different window

```shell
kubectl run httping -it --image bretfisher/httping --rm=true -- browncoat/healthz 
```

Now apply the new image and env var

```shell
kubectl apply -f kubernetes-examples/browncoat-v2.yaml
```

### Add readinessProbe and monitor a new

Now we will add a readinessProbe to check if the endpoint `healthz` returns a
successful response and will change to the image v1 to see a different response code (`201`).

```shell
kubectl apply -f  kubernetes-examples/browncoat-v1-withProbe.yaml
```

## This is a Node.js app using [Express](https://expressjs.com/) for easier http servering

and [Stoppable](https://github.com/hunterloftis/stoppable) for better graceful shutdowns.
