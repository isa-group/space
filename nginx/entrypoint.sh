#!/bin/sh
set -e

# si no se define → vacío
BASE_URL_PATH="${BASE_URL_PATH:-}"

echo "Starting nginx with BASE_URL_PATH='${BASE_URL_PATH}'"

envsubst '$BASE_URL_PATH' \
  < /etc/nginx/templates/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'