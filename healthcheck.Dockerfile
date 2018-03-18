FROM bretfisher/healthcheck-docker-demo:latest

# check every 5s to ensure this service returns HTTP 200
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \ 
  CMD curl -fs http://localhost:$PORT/healthz || exit 1

