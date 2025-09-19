#!/bin/bash

# Family Tree Builder - Production Deployment Script
# This script helps deploy the application using Docker Hub images

set -e

echo "🚀 Family Tree Builder - Production Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-user/family-tree}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    if ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    else
        print_status "Using 'docker compose' (v2)"
        DOCKER_COMPOSE="docker compose"
    fi
else
    print_status "Using 'docker-compose' (v1)"
    DOCKER_COMPOSE="docker-compose"
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    print_warning "Environment file $ENV_FILE not found."
    if [ -f ".env.production.example" ]; then
        print_status "Copying .env.production.example to $ENV_FILE"
        cp .env.production.example "$ENV_FILE"
        print_warning "Please edit $ENV_FILE with your configuration before continuing."
        exit 1
    else
        print_error "No environment configuration found. Please create $ENV_FILE"
        exit 1
    fi
fi

# Source environment variables
set -a
source "$ENV_FILE"
set +a

print_success "Prerequisites check completed"

# Login to Docker Hub
print_status "Logging in to Docker Hub..."

if [ -n "$DOCKERHUB_TOKEN" ]; then
    echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
    print_success "Successfully logged in to Docker Hub"
else
    print_warning "DOCKERHUB_TOKEN not set. Attempting to pull public images..."
fi

# Pull latest images
print_status "Pulling Docker images..."
print_status "Repository: kirito70/family-tree"
print_status "Tag: $IMAGE_TAG"

docker pull "kirito70/family-tree-backend:$IMAGE_TAG" || {
    print_error "Failed to pull backend image"
    exit 1
}

docker pull "kirito70/family-tree-frontend:$IMAGE_TAG" || {
    print_error "Failed to pull frontend image"
    exit 1
}

print_success "Images pulled successfully"

# Stop existing containers
print_status "Stopping existing containers..."
$DOCKER_COMPOSE -f "$COMPOSE_FILE" down || print_warning "No existing containers to stop"

# Start services
print_status "Starting services..."
$DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."

# Wait for database
print_status "Waiting for database..."
timeout 60 bash -c 'until docker exec family-tree-db-prod mysqladmin ping -h localhost --silent; do sleep 2; done' || {
    print_error "Database failed to start"
    exit 1
}

# Wait for backend
print_status "Waiting for backend..."
timeout 60 bash -c 'until curl -f http://localhost:'"${BACKEND_PORT:-8080}"'/api/health >/dev/null 2>&1; do sleep 2; done' || {
    print_error "Backend failed to start"
    exit 1
}

# Wait for frontend
print_status "Waiting for frontend..."
timeout 60 bash -c 'until curl -f http://localhost:'"${FRONTEND_PORT:-3000}"' >/dev/null 2>&1; do sleep 2; done' || {
    print_error "Frontend failed to start"
    exit 1
}

print_success "All services are healthy"

# Show status
print_status "Deployment Status:"
$DOCKER_COMPOSE -f "$COMPOSE_FILE" ps

# Show URLs
echo ""
print_success "🎉 Deployment completed successfully!"
print_status "Service URLs:"
echo "  📱 Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "  🔧 Backend API: http://localhost:${BACKEND_PORT:-8080}/api"
echo "  📊 Backend Health: http://localhost:${BACKEND_PORT:-8080}/api/health"

if [ "${HTTP_PORT:-80}" != "80" ] || [ "${HTTPS_PORT:-443}" != "443" ]; then
    echo "  🌐 Reverse Proxy: http://localhost:${HTTP_PORT:-80}"
fi

echo ""
print_status "To view logs: $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f"
print_status "To stop services: $DOCKER_COMPOSE -f $COMPOSE_FILE down"

echo ""
print_warning "Remember to:"
echo "  1. Configure your domain and SSL certificates"
echo "  2. Set up proper firewall rules"
echo "  3. Configure regular backups"
echo "  4. Monitor application logs"