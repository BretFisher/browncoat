FROM node:8-alpine

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV \
    PORT=80 \
    VERSION=v1 \
    FAIL_STARTUP=false \
    DELAY_STARTUP=0 \
    DELAY_HEALTHCHECK=0 \
    HAPPYHEALTHCHECK=true

WORKDIR /opt

COPY package.json package-lock.json* ./

RUN npm install && npm cache clean --force

ENV PATH /opt/node_modules/.bin:$PATH

WORKDIR /opt/app

COPY . /opt/app

# NO HEALTHCHECK

CMD [ "node", "app.js" ]

# vi:syntax=Dockerfile
