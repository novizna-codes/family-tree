#!/bin/bash

# Quick test script for built Docker images
echo "🧪 Testing Family Tree Docker Images"
echo "===================================="

# Test backend image
echo "📦 Testing backend image..."
if docker image inspect family-tree-backend:test >/dev/null 2>&1; then
    echo "✅ Backend image built successfully"
    echo "   Size: $(docker image inspect family-tree-backend:test --format='{{.Size}}' | numfmt --to=iec)"
else
    echo "❌ Backend image not found"
    exit 1
fi

# Test frontend image
echo "📦 Testing frontend image..."
if docker image inspect family-tree-frontend:test >/dev/null 2>&1; then
    echo "✅ Frontend image built successfully"
    echo "   Size: $(docker image inspect family-tree-frontend:test --format='{{.Size}}' | numfmt --to=iec)"
else
    echo "❌ Frontend image not found"
    exit 1
fi

# Test running containers briefly
echo "🚀 Testing container startup..."

# Test backend container
echo "   Starting backend container..."
BACKEND_ID=$(docker run -d --name test-backend -p 8081:80 family-tree-backend:test)
sleep 10

if curl -f http://localhost:8081/api/health >/dev/null 2>&1; then
    echo "✅ Backend container is responding"
else
    echo "❌ Backend container failed to respond"
    docker logs test-backend
fi

# Cleanup
docker stop test-backend >/dev/null 2>&1
docker rm test-backend >/dev/null 2>&1

# Test frontend container
echo "   Starting frontend container..."
FRONTEND_ID=$(docker run -d --name test-frontend -p 3001:80 family-tree-frontend:test)
sleep 5

if curl -f http://localhost:3001 >/dev/null 2>&1; then
    echo "✅ Frontend container is responding"
else
    echo "❌ Frontend container failed to respond"
    docker logs test-frontend
fi

# Cleanup
docker stop test-frontend >/dev/null 2>&1
docker rm test-frontend >/dev/null 2>&1

echo ""
echo "🎉 All tests completed!"
echo ""
echo "📋 Image Summary:"
echo "   Backend:  family-tree-backend:test"
echo "   Frontend: family-tree-frontend:test"
echo ""
echo "🚀 Ready for GitHub Container Registry deployment!"