# Build stage
FROM node:20-alpine AS build

# Install canvas dependencies for build
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

# Install canvas runtime dependencies
RUN apk add --no-cache \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    font-noto-cjk

WORKDIR /app

COPY package*.json ./

# Install canvas build dependencies, install packages, then remove build deps
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    && npm install --production \
    && apk del .build-deps

COPY --from=build /app/dist ./dist
COPY server.js .
COPY config.example.json .

# Create data directory
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

EXPOSE 3000

CMD ["node", "server.js"]
