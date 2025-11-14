#!/bin/bash
# MindCheck Setup Script

set -e

echo "🚀 MindCheck Setup Script"
echo "========================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install $1 first."
        exit 1
    else
        echo "✅ $1 is installed"
    fi
}

check_command node
check_command npm
check_command docker
check_command docker-compose
check_command psql

echo ""
echo "🔧 Setting up environment files..."

# Copy environment files
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created root .env file"
else
    echo "ℹ️  Root .env file already exists"
fi

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env file"
else
    echo "ℹ️  backend/.env file already exists"
fi

if [ ! -f dashboard/.env ]; then
    echo "REACT_APP_API_URL=http://localhost:3000/api" > dashboard/.env
    echo "✅ Created dashboard/.env file"
else
    echo "ℹ️  dashboard/.env file already exists"
fi

echo ""
echo "📦 Installing dependencies..."

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend && npm install && cd ..

# Install dashboard dependencies
echo "Installing dashboard dependencies..."
cd dashboard && npm install && cd ..

# Install mobile dependencies
echo "Installing mobile dependencies..."
cd mobile && npm install && cd ..

echo ""
echo "🐳 Docker Setup"
echo "Do you want to use Docker? (recommended) [y/N]"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Starting Docker services..."
    docker-compose up -d postgres redis
    
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
    
    echo "Creating database..."
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE mindcheck;" || true
    
    echo "Running database migrations..."
    docker-compose exec -T postgres psql -U postgres -d mindcheck -f /docker-entrypoint-initdb.d/01-schema.sql
    
    echo ""
    echo "✅ Docker services are running!"
    echo ""
    echo "To start all services with Docker:"
    echo "  docker-compose up -d"
    echo ""
else
    echo ""
    echo "📝 Manual Database Setup Required:"
    echo "1. Create a PostgreSQL database named 'mindcheck'"
    echo "2. Run the schema file:"
    echo "   psql -U postgres -d mindcheck -f backend/src/db/schema.sql"
    echo ""
fi

echo "🎉 Setup Complete!"
echo ""
echo "📚 Next Steps:"
echo "1. Update the .env files with your configuration"
echo "2. Start the services:"
echo ""
echo "   # With Docker (recommended):"
echo "   docker-compose up -d"
echo ""
echo "   # Or manually:"
echo "   # Terminal 1 - Backend:"
echo "   cd backend && npm run dev"
echo ""
echo "   # Terminal 2 - Dashboard:"
echo "   cd dashboard && npm start"
echo ""
echo "   # Terminal 3 - Mobile (iOS):"
echo "   cd mobile && npm run ios"
echo ""
echo "3. Access the applications:"
echo "   - API: http://localhost:3000"
echo "   - Admin Dashboard: http://localhost:3001"
echo "   - API Docs: http://localhost:3000/api/docs"
echo ""
echo "📖 For more information, see README.md"
