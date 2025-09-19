#!/bin/sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[BACKEND]${NC} Starting Family Tree Builder Backend initialization..."

# Wait for database to be ready
echo -e "${BLUE}[BACKEND]${NC} Waiting for database connection..."
while ! mysql -h"${DB_HOST:-db}" -P"${DB_PORT:-3306}" -u"${DB_USERNAME:-family_tree_user}" -p"${DB_PASSWORD:-family_tree_password}" -e "SELECT 1" > /dev/null 2>&1; do
    echo -e "${BLUE}[BACKEND]${NC} Database not ready, waiting..."
    sleep 2
done

echo -e "${GREEN}[BACKEND]${NC} Database connection established!"

# Run migrations
echo -e "${BLUE}[BACKEND]${NC} Running database migrations..."
php artisan migrate --force

# Check if migrations were successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[BACKEND]${NC} Database migrations completed successfully!"
else
    echo -e "${RED}[BACKEND]${NC} Database migrations failed!"
    exit 1
fi

# Run seeders (only if not already run)
echo -e "${BLUE}[BACKEND]${NC} Running database seeders..."
php artisan db:seed --force

# Check if seeders were successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[BACKEND]${NC} Database seeders completed successfully!"
else
    echo -e "${RED}[BACKEND]${NC} Database seeders failed!"
    exit 1
fi

# Generate application key if not set
if [ -z "$APP_KEY" ]; then
    echo -e "${BLUE}[BACKEND]${NC} Generating application key..."
    php artisan key:generate --force
fi

# Clear and cache configurations for production
if [ "$APP_ENV" = "production" ]; then
    echo -e "${BLUE}[BACKEND]${NC} Optimizing for production..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache
fi

# Create storage symlink if it doesn't exist
if [ ! -L "/var/www/html/public/storage" ]; then
    echo -e "${BLUE}[BACKEND]${NC} Creating storage symlink..."
    php artisan storage:link
fi

echo -e "${GREEN}[BACKEND]${NC} Backend initialization completed successfully!"
echo -e "${BLUE}[BACKEND]${NC} Starting services..."

# Start supervisor to manage PHP-FPM and Nginx
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf