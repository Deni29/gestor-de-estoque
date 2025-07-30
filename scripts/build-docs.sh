#!/bin/bash

# Documentation Build Script for Stock Management System

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

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          Documentation Build - Stock Management          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if MkDocs is installed
if ! command -v mkdocs &> /dev/null; then
    log_error "MkDocs is not installed. Installing now..."
    pip install --user -r docs/requirements.txt
    export PATH=$PATH:~/.local/bin
fi

# Validate documentation
log_info "Validating documentation structure..."
if [ ! -f "mkdocs.yml" ]; then
    log_error "mkdocs.yml not found!"
    exit 1
fi

if [ ! -f "docs/index.md" ]; then
    log_error "docs/index.md not found!"
    exit 1
fi

log_success "Documentation structure validated"

# Build documentation
log_info "Building documentation..."
mkdocs build --clean

if [ $? -eq 0 ]; then
    log_success "Documentation built successfully!"
    log_info "Documentation available in: ./site/"
else
    log_error "Documentation build failed!"
    exit 1
fi

# Check for deployment option
if [ "$1" = "serve" ]; then
    log_info "Starting development server..."
    mkdocs serve --dev-addr=0.0.0.0:8000
elif [ "$1" = "deploy" ]; then
    log_info "Deploying to GitHub Pages..."
    mkdocs gh-deploy --force
    log_success "Documentation deployed to GitHub Pages!"
elif [ "$1" = "docker" ]; then
    log_info "Building Docker image for documentation..."
    
    # Create Dockerfile for documentation
    cat > Dockerfile.docs << 'EOF'
FROM nginx:alpine
COPY site/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
    
    docker build -f Dockerfile.docs -t stock-management-docs .
    rm Dockerfile.docs
    
    log_success "Docker image 'stock-management-docs' built successfully!"
    log_info "Run with: docker run -p 8080:80 stock-management-docs"
else
    log_info "Documentation build completed!"
    log_info ""
    log_info "Available commands:"
    echo "  ./scripts/build-docs.sh serve   - Start development server"
    echo "  ./scripts/build-docs.sh deploy  - Deploy to GitHub Pages"
    echo "  ./scripts/build-docs.sh docker  - Build Docker image"
    log_info ""
    log_info "Or use npm scripts:"
    echo "  npm run docs:build  - Build documentation"
    echo "  npm run docs:serve  - Start development server"
    echo "  npm run docs:deploy - Deploy to GitHub Pages"
fi