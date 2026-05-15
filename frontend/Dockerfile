# Build stage
FROM node:22-alpine as builder

WORKDIR /build

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the web application (Expo static export)
RUN npm run build

# Runtime stage
FROM nginx:alpine

# Install wget for container health checks and jq for safe JSON generation
RUN apk add --no-cache wget jq

# Copy built artifacts from builder
COPY --from=builder /build/dist /usr/share/nginx/html

# Copy nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["/docker-entrypoint.sh"]
