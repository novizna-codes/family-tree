#!/bin/bash

# Family Tree Builder - Development Setup Script

set -e

echo "🌳 Family Tree Builder - Development Setup"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

echo "✅ Docker is running"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Application
APP_NAME=Family Tree Builder
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:3000

# Database
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=family_tree
DB_USERNAME=family_tree_user
DB_PASSWORD=family_tree_password
DB_ROOT_PASSWORD=rootpassword

# Sanctum
SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost:5173

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Mail (Mailhog for development)
MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=noreply@familytree.local
MAIL_FROM_NAME=Family Tree Builder
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Build and start containers
echo "🏗️  Building and starting containers..."
docker-compose up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run Laravel setup commands
echo "🔧 Setting up Laravel backend..."
docker-compose exec backend php artisan key:generate
docker-compose exec backend php artisan migrate
docker-compose exec backend php artisan db:seed

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📱 Applications are now running:"
echo "   Frontend:    http://localhost:3000"
echo "   Backend API: http://localhost:8080/api"
echo "   phpMyAdmin:  http://localhost:8081"
echo "   Mailhog:     http://localhost:8025"
echo ""
echo "🛠️  Development commands:"
echo "   docker-compose logs -f          # View logs"
echo "   docker-compose down             # Stop containers"
echo "   docker-compose exec backend php artisan migrate  # Run migrations"
echo ""
echo "📚 For more information, see the README.md file"