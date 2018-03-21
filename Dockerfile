FROM node:8-alpine

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

RUN apk add --no-cache --virtual curl

WORKDIR /opt

COPY package.json package-lock.json* ./

RUN npm install && npm cache clean --force

ENV PATH /opt/node_modules/.bin:$PATH

WORKDIR /opt/app

COPY . /opt/app

# NO HEALTHCHECK

CMD [ "node", "app.js" ]

# vi:syntax=Dockerfile
