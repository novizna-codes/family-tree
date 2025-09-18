# Multi-stage build for React Frontend
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./

# Install all dependencies
RUN npm ci --include=dev && npm cache clean --force

# Copy source code
COPY . .

# Build the application for production
RUN npm run build

# Verify build output
RUN ls -la dist/ && echo "Build completed successfully"

# Development stage for local development
FROM node:20-alpine AS development

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm ci --include=dev && npm cache clean --force

# Copy source code
COPY . .

# Create start-dev.sh script
RUN echo '#!/bin/sh' > start-dev.sh && \
    echo 'echo "Starting Vite development server..."' >> start-dev.sh && \
    echo 'npm run dev -- --host 0.0.0.0 --port 80' >> start-dev.sh && \
    chmod +x start-dev.sh

# Expose port 80 for development
EXPOSE 80

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start development server
CMD ["./start-dev.sh"]

# Production stage with optimized nginx
FROM nginx:1.25-alpine AS production

# Install curl for health checks and security updates
RUN apk add --no-cache curl \
    && apk upgrade

# Copy optimized nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script for runtime configuration
COPY docker/entrypoint.sh /entrypoint.sh

# Create nginx user and setup directories
RUN addgroup -g 1001 -S nginx-app && \
    adduser -u 1001 -S nginx-app -G nginx-app && \
    chmod +x /entrypoint.sh

# Copy built application from builder stage
COPY --from=builder --chown=nginx-app:nginx-app /app/dist /usr/share/nginx/html

# Copy custom error pages
RUN echo '<html><head><title>404 Not Found</title></head><body><h1>404 - Page Not Found</h1><p>The page you are looking for could not be found.</p></body></html>' > /usr/share/nginx/html/404.html

# Security: Remove default nginx user and unnecessary files
RUN rm -rf /etc/nginx/conf.d/default.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Labels for better image management
LABEL org.opencontainers.image.title="Family Tree Frontend" \
      org.opencontainers.image.description="React frontend for Family Tree Builder" \
      org.opencontainers.image.vendor="Novizna" \
      org.opencontainers.image.source="https://github.com/novizna-codes/family-tree"

# Expose port
EXPOSE 80

# Start nginx with runtime configuration
CMD ["/entrypoint.sh"]