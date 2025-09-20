# Multi-stage build for Laravel Backend using serversideup/docker-php
FROM serversideup/php:8.2-fpm-nginx AS base

# Set working directory
WORKDIR /var/www/html

# Copy composer files first for better layer caching
COPY composer.json composer.lock ./

# Development stage
FROM base AS development

# Install all dependencies including dev
RUN composer install --optimize-autoloader --no-progress --no-interaction

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Production stage
FROM base AS production

# Install production dependencies only
RUN composer install --no-dev --optimize-autoloader --no-progress --no-interaction --no-scripts

# Copy application code
COPY . .

# Generate optimized autoloader
RUN composer dump-autoload --optimize

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Labels for better image management
LABEL org.opencontainers.image.title="Family Tree Backend" \
      org.opencontainers.image.description="Laravel backend for Family Tree Builder" \
      org.opencontainers.image.vendor="Novizna" \
      org.opencontainers.image.source="https://github.com/novizna-codes/family-tree"

# Expose port (serversideup/docker-php uses 8080 by default)
EXPOSE 8080