#!/bin/sh

# Generate env-config.js from environment variables
cat <<EOF > /usr/share/nginx/html/env-config.js
window.env = {
  TMDB_API_KEY: "${TMDB_API_KEY}",
  TMDB_API_URL: "${TMDB_API_URL:-https://api.themoviedb.org/3}",
  TMDB_IMAGE_URL: "${TMDB_IMAGE_URL:-https://image.tmdb.org/t/p/w500}"
};
EOF

# Execute the CMD
exec "$@"
