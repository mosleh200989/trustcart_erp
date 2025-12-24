#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   🚀 TrustCart ERP - Docker Setup                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create necessary directories
mkdir -p postgres_data redis_data
chmod 755 postgres_data redis_data

echo "📁 Created data directories"

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   ✅ Services started successfully                             ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║   PostgreSQL:  localhost:5432                                 ║"
    echo "║   Redis:       localhost:6379                                 ║"
    echo "║   Backend:     http://localhost:3000                          ║"
    echo "║   Frontend:    http://localhost:5173                          ║"
    echo "║   API Docs:    http://localhost:3000/api/docs                ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║   PostgreSQL Credentials:                                     ║"
    echo "║   User:     trustcart_user                                   ║"
    echo "║   Password: trustcart_secure_password                        ║"
    echo "║   Database: trustcart_erp                                    ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "View logs with: docker-compose logs -f"
    echo "Stop services: docker-compose down"
else
    echo "❌ Failed to start services"
    exit 1
fi
