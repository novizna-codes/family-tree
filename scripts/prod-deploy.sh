#!/bin/bash

# Family Tree Builder - Production Deployment Script

set -e

echo "🌳 Family Tree Builder - Production Deployment"
echo "=============================================="

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ .env.prod file not found. Please create it with production settings."
    echo "📝 Example .env.prod:"
    cat << EOF
APP_NAME=Family Tree Builder
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_DATABASE=family_tree_prod
DB_USERNAME=your_db_user
DB_PASSWORD=your_secure_password
DB_ROOT_PASSWORD=your_root_password

SANCTUM_STATEFUL_DOMAINS=your-domain.com

MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-email-password
EOF
    exit 1
fi

echo "✅ Loading production environment"
export $(cat .env.prod | xargs)

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Start production containers
echo "🚀 Starting production containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Run production setup
echo "🔧 Running production setup..."
docker-compose -f docker-compose.prod.yml exec backend php artisan migrate --force
docker-compose -f docker-compose.prod.yml exec backend php artisan config:cache
docker-compose -f docker-compose.prod.yml exec backend php artisan route:cache
docker-compose -f docker-compose.prod.yml exec backend php artisan view:cache

echo ""
echo "🎉 Production deployment complete!"
echo ""
echo "🌐 Application is now running at: ${APP_URL}"
echo ""
echo "🔧 Management commands:"
echo "   docker-compose -f docker-compose.prod.yml logs -f  # View logs"
echo "   docker-compose -f docker-compose.prod.yml down     # Stop containers"
echo ""