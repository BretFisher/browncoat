# syntax=docker/dockerfile:1
FROM node:22-alpine as v1

# default version for latest and v1 tags. No healthcheck and version set to v1

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV \
    PORT=80 \
    VERSION=v1 \
    FAIL_STARTUP=false \
    DELAY_STARTUP=0 \
    DELAY_HEALTHCHECK=0 \
    HAPPYHEALTHCHECK=true \
    ENABLE_LOGGER=true

RUN apk add --no-cache curl

WORKDIR /opt

COPY package.json package-lock.json* ./

RUN npm install && npm cache clean --force

ENV PATH /opt/node_modules/.bin:$PATH

WORKDIR /opt/app

COPY . /opt/app

# NO HEALTHCHECK

CMD [ "node", "app.js" ]


FROM v1 as v1-healthcheck
# check every 5s to ensure this service returns HTTP 200
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \ 
    CMD curl -fs http://localhost:$PORT/healthz || exit 1


FROM v1 as v2
ENV VERSION=v2


FROM v1-healthcheck as v2-healthcheck
ENV VERSION=v2


FROM v1 as v3
ENV VERSION=v3 \
    FAIL_STARTUP=true


FROM v1-healthcheck as v3-healthcheck
ENV VERSION=v3 \
    HAPPYHEALTHCHECK=false
