#!/bin/bash

# Setup Script for Stock Management System
# This script sets up the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependency() {
    if command -v $1 &> /dev/null; then
        log_success "$1 is installed"
    else
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║    Stock Management System - Development Setup           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check dependencies
log_info "Checking dependencies..."
check_dependency "node"
check_dependency "npm"
check_dependency "docker"
check_dependency "docker-compose"

# Check Flutter for mobile development
if command -v flutter &> /dev/null; then
    log_success "Flutter is installed"
    SETUP_MOBILE=true
else
    log_warning "Flutter is not installed. Mobile setup will be skipped."
    SETUP_MOBILE=false
fi

# Check Firebase CLI
if command -v firebase &> /dev/null; then
    log_success "Firebase CLI is installed"
else
    log_warning "Firebase CLI is not installed. Installing..."
    npm install -g firebase-tools
fi

# Project setup
log_info "Setting up project structure..."

# Create necessary directories
mkdir -p logs
mkdir -p data/uploads
mkdir -p data/exports
mkdir -p temp

# Backend setup
log_info "Setting up backend services..."

# Shared library
cd backend/shared
log_info "Installing shared dependencies..."
npm install
npm run build
log_success "Shared library built successfully"
cd ../..

# Products service
cd backend/products
log_info "Setting up products service..."
npm install
if [ ! -f .env ]; then
    cp .env.example .env
    log_warning "Please configure .env file for products service"
fi
cd ../..

# Stock service
if [ -d "backend/stock" ]; then
    cd backend/stock
    log_info "Setting up stock service..."
    npm install
    if [ ! -f .env ]; then
        cp .env.example .env
        log_warning "Please configure .env file for stock service"
    fi
    cd ../..
fi

# Frontend Web setup
log_info "Setting up web frontend..."
cd frontend/web
npm install
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    log_warning "Please configure .env.local file for web frontend"
fi
cd ../..

# Mobile setup (if Flutter is available)
if [ "$SETUP_MOBILE" = true ]; then
    log_info "Setting up mobile application..."
    cd frontend/mobile
    flutter pub get
    
    # Generate code
    log_info "Generating Flutter code..."
    flutter pub run build_runner build --delete-conflicting-outputs
    
    cd ../..
    log_success "Mobile application setup completed"
fi

# Firebase setup
log_info "Setting up Firebase emulators..."
cd infrastructure/firebase
if [ ! -f firebase.json ]; then
    firebase init emulators --project demo-project
fi
cd ../..

# Docker setup
log_info "Setting up Docker environment..."
cd infrastructure

# Create docker environment file
if [ ! -f .env ]; then
    cat > .env << EOF
# Environment variables for Docker Compose
COMPOSE_PROJECT_NAME=stock-management
NODE_ENV=development

# Database
POSTGRES_DB=stock_analytics
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Firebase
FIREBASE_PROJECT_ID=demo-project

# API
API_PORT=8080
WEB_PORT=3000
EOF
    log_warning "Created .env file for Docker. Please review and configure if needed."
fi

cd ..

# Git hooks setup
log_info "Setting up Git hooks..."
if [ -d ".git" ]; then
    # Pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Run linting and tests before commit

echo "Running pre-commit checks..."

# Backend linting
cd backend/shared && npm run lint
cd ../products && npm run lint

# Frontend linting
cd ../../frontend/web && npm run lint

# Run tests
npm run test:unit

echo "Pre-commit checks passed!"
EOF

    chmod +x .git/hooks/pre-commit
    log_success "Git hooks configured"
fi

# Create development scripts
log_info "Creating development scripts..."

# Start development script
cat > scripts/dev.sh << 'EOF'
#!/bin/bash
# Start development environment

echo "Starting Stock Management System in development mode..."

# Start Firebase emulators in background
cd infrastructure/firebase
firebase emulators:start &
FIREBASE_PID=$!

# Wait for Firebase emulators to start
sleep 10

# Start backend services
cd ../../backend/products
npm run dev &
PRODUCTS_PID=$!

# Start web frontend
cd ../../frontend/web
npm run dev &
WEB_PID=$!

echo "Development environment started!"
echo "Firebase Emulator UI: http://localhost:4000"
echo "Web Application: http://localhost:3000"
echo "Products API: http://localhost:8081"

# Wait for user input to stop
read -p "Press Enter to stop all services..."

# Kill all background processes
kill $FIREBASE_PID $PRODUCTS_PID $WEB_PID 2>/dev/null
echo "All services stopped."
EOF

chmod +x scripts/dev.sh

# Build script
cat > scripts/build.sh << 'EOF'
#!/bin/bash
# Build all components

echo "Building Stock Management System..."

# Build shared library
cd backend/shared
npm run build

# Build backend services
cd ../products
npm run build

# Build web frontend
cd ../../frontend/web
npm run build

echo "Build completed successfully!"
EOF

chmod +x scripts/build.sh

# Test script
cat > scripts/test.sh << 'EOF'
#!/bin/bash
# Run all tests

echo "Running all tests..."

# Backend tests
cd backend/shared
npm test

cd ../products
npm test

# Frontend tests
cd ../../frontend/web
npm test

echo "All tests completed!"
EOF

chmod +x scripts/test.sh

# Create package.json for root workspace
if [ ! -f package.json ]; then
    cat > package.json << 'EOF'
{
  "name": "stock-management-system",
  "version": "1.0.0",
  "description": "Stock Management System - Root workspace",
  "private": true,
  "workspaces": [
    "backend/shared",
    "backend/products",
    "backend/stock",
    "backend/suppliers",
    "backend/customers",
    "backend/reports",
    "backend/auth",
    "frontend/web"
  ],
  "scripts": {
    "dev": "./scripts/dev.sh",
    "build": "./scripts/build.sh",
    "test": "./scripts/test.sh",
    "setup": "./scripts/setup.sh",
    "docker:up": "cd infrastructure && docker-compose up -d",
    "docker:down": "cd infrastructure && docker-compose down",
    "docker:logs": "cd infrastructure && docker-compose logs -f",
    "firebase:start": "cd infrastructure/firebase && firebase emulators:start",
    "clean": "rm -rf node_modules backend/*/node_modules frontend/*/node_modules",
    "fresh": "npm run clean && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "cross-env": "^7.0.3"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
EOF
    
    npm install
    log_success "Root workspace configured"
fi

# Final message
log_success "Setup completed successfully!"
echo
echo -e "${GREEN}Next steps:${NC}"
echo "1. Configure Firebase project:"
echo "   - firebase login"
echo "   - firebase use --add [your-project-id]"
echo
echo "2. Configure environment variables in .env files"
echo
echo "3. Start development environment:"
echo "   npm run dev"
echo
echo "4. Or use Docker:"
echo "   npm run docker:up"
echo
echo -e "${BLUE}Access URLs:${NC}"
echo "- Web App: http://localhost:3000"
echo "- API Gateway: http://localhost:8080"
echo "- Firebase Emulator: http://localhost:4000"
echo "- Grafana: http://localhost:3001"
echo
echo -e "${YELLOW}Documentation: README.md${NC}"
echo
echo "Happy coding! 🚀"