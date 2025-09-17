# Multi-stage build for Laravel Backend
FROM php:8.2-fpm-alpine AS base

# Install system dependencies and PHP extensions in one layer
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    mysql-client \
    nginx \
    supervisor \
    oniguruma-dev \
    libzip-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        mysqli \
        pcntl \
        gd \
        xml \
        zip \
        mbstring \
        bcmath \
    && apk del --no-cache \
        libpng-dev \
        libxml2-dev \
        oniguruma-dev \
        libzip-dev \
        freetype-dev \
        libjpeg-turbo-dev

# Install Composer with verification
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Create app user for security
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

# Set working directory
WORKDIR /var/www/html

# Copy composer files first for better layer caching
COPY --chown=appuser:appgroup composer.json composer.lock ./

# Development stage
FROM base AS development

# Install all dependencies including dev
RUN composer install --optimize-autoloader --no-progress --no-interaction

# Copy application code
COPY --chown=appuser:appgroup . .

# Copy and make entrypoint executable
COPY --chown=appuser:appgroup docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set permissions
RUN chown -R appuser:appgroup /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# Copy configurations
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port
EXPOSE 80

# Start with entrypoint
CMD ["/usr/local/bin/docker-entrypoint.sh"]

# Production stage
FROM base AS production

# Install production dependencies only
RUN composer install --no-dev --optimize-autoloader --no-progress --no-interaction --no-scripts

# Copy application code
COPY --chown=appuser:appgroup . .

# Copy and make entrypoint executable
COPY --chown=appuser:appgroup docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create required directories and set permissions
RUN mkdir -p /var/www/html/storage/framework/{cache,sessions,views} \
    && mkdir -p /var/www/html/storage/logs \
    && mkdir -p /var/www/html/bootstrap/cache \
    && chown -R appuser:appgroup /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# Generate optimized autoloader and cache configs
RUN composer dump-autoload --optimize \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && php artisan event:cache

# Copy configurations
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

# Labels for better image management
LABEL org.opencontainers.image.title="Family Tree Backend" \
      org.opencontainers.image.description="Laravel backend for Family Tree Builder" \
      org.opencontainers.image.vendor="Novizna" \
      org.opencontainers.image.source="https://github.com/novizna-codes/family-tree"

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 80

# Start with entrypoint
CMD ["/usr/local/bin/docker-entrypoint.sh"]