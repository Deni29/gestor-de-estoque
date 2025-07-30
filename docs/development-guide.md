# Development Guide

This guide provides comprehensive information for developers working on the Stock Management System.

## 🏗️ Architecture Overview

The Stock Management System is built using a modern microservices architecture with the following components:

### Backend Services
- **Shared Library** (`backend/shared`) - Common utilities and interfaces
- **Products Service** (`backend/products`) - Product management and inventory
- **Stock Service** (`backend/stock`) - Stock level tracking and movements
- **Suppliers Service** (`backend/suppliers`) - Supplier management
- **Customers Service** (`backend/customers`) - Customer relationship management
- **Reports Service** (`backend/reports`) - Analytics and reporting
- **Auth Service** (`backend/auth`) - Authentication and authorization

### Frontend Applications
- **Web Application** (`frontend/web`) - React-based web interface
- **Mobile Application** (`frontend/mobile`) - Flutter mobile app

### Infrastructure
- **Firebase** - Authentication, Firestore database, and hosting
- **Docker** - Containerization and development environment
- **Monitoring** - Grafana and other observability tools

## 🛠️ Development Setup

### Prerequisites

Before starting development, ensure you have the following installed:

- **Node.js** (>= 18.0.0)
- **npm** (>= 8.0.0)
- **Docker** and **Docker Compose**
- **Flutter** (for mobile development)
- **Firebase CLI**

### Quick Setup

Run the automated setup script:

```bash
./scripts/setup.sh
```

This script will:
1. Check dependencies
2. Install Node.js packages
3. Set up Firebase emulators
4. Configure Docker environment
5. Create development scripts

### Manual Setup

If you prefer manual setup:

1. **Install dependencies for all services:**
   ```bash
   # Backend shared library
   cd backend/shared
   npm install
   npm run build

   # Products service
   cd ../products
   npm install

   # Web frontend
   cd ../../frontend/web
   npm install

   # Mobile app (if Flutter is available)
   cd ../mobile
   flutter pub get
   ```

2. **Configure environment variables:**
   ```bash
   # Copy example files
   cp backend/products/.env.example backend/products/.env
   cp frontend/web/.env.example frontend/web/.env.local
   ```

3. **Set up Firebase:**
   ```bash
   cd infrastructure/firebase
   firebase login
   firebase init emulators
   ```

## 🚀 Running the Development Environment

### Option 1: Using npm scripts (Recommended)

```bash
# Start all services in development mode
npm run dev
```

This will start:
- Firebase emulators
- Backend services
- Web frontend

### Option 2: Using Docker

```bash
# Start with Docker Compose
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Option 3: Manual startup

```bash
# Terminal 1: Firebase emulators
cd infrastructure/firebase
firebase emulators:start

# Terminal 2: Products service
cd backend/products
npm run dev

# Terminal 3: Web frontend
cd frontend/web
npm run dev
```

## 📝 Development Workflow

### Code Style and Linting

The project uses ESLint and Prettier for code formatting:

```bash
# Lint all code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### Testing

```bash
# Run all tests
npm run test

# Run specific service tests
cd backend/products
npm test

# Run frontend tests
cd frontend/web
npm test
```

### Git Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Pre-commit hooks will run automatically** to check:
   - Code linting
   - Unit tests
   - Type checking

4. **Push and create a Pull Request:**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🏗️ Service Development

### Adding a New Microservice

1. **Create service directory:**
   ```bash
   mkdir backend/your-service
   cd backend/your-service
   ```

2. **Initialize package.json:**
   ```bash
   npm init -y
   ```

3. **Install shared library:**
   ```bash
   npm install ../shared
   ```

4. **Follow the existing service structure:**
   ```
   backend/your-service/
   ├── src/
   │   ├── controllers/
   │   ├── services/
   │   ├── routes/
   │   ├── models/
   │   └── index.ts
   ├── tests/
   ├── package.json
   ├── tsconfig.json
   └── .env.example
   ```

### API Development Guidelines

1. **Use TypeScript** for all backend code
2. **Follow RESTful conventions** for API endpoints
3. **Implement proper error handling** using the shared library
4. **Add comprehensive tests** for all endpoints
5. **Document APIs** using OpenAPI/Swagger

### Frontend Development

#### Web Application (React)

1. **Component Structure:**
   ```
   frontend/web/src/
   ├── components/          # Reusable components
   ├── pages/              # Page components
   ├── hooks/              # Custom React hooks
   ├── services/           # API services
   ├── store/              # Redux store
   ├── utils/              # Utility functions
   └── types/              # TypeScript types
   ```

2. **State Management:**
   - Use **Redux Toolkit** for global state
   - Use **React Query** for server state
   - Use local state for component-specific data

3. **Styling:**
   - Use **Material-UI** components
   - Follow the design system
   - Use responsive design principles

#### Mobile Application (Flutter)

1. **Project Structure:**
   ```
   frontend/mobile/
   ├── lib/
   │   ├── models/         # Data models
   │   ├── services/       # API services
   │   ├── widgets/        # Reusable widgets
   │   ├── screens/        # Screen widgets
   │   └── main.dart
   ├── test/
   └── pubspec.yaml
   ```

2. **State Management:**
   - Use **Provider** or **Riverpod** for state management
   - Use **Dio** for HTTP requests

## 🔧 Debugging

### Backend Services

1. **Use VS Code debugger** with the provided launch configurations
2. **Enable debug logging:**
   ```bash
   DEBUG=* npm run dev
   ```

3. **Firebase Emulator UI:**
   - Access at http://localhost:4000
   - View Firestore data, Auth users, and logs

### Frontend

1. **React Developer Tools** browser extension
2. **Redux DevTools** for state debugging
3. **Network tab** for API call debugging

## 📦 Building for Production

```bash
# Build all services
npm run build

# Build specific components
cd backend/products
npm run build

cd frontend/web
npm run build
```

## 🧪 Testing Strategy

### Unit Tests
- Test individual functions and components
- Use Jest for JavaScript/TypeScript
- Use Flutter test framework for mobile

### Integration Tests
- Test API endpoints with database
- Test component interactions

### E2E Tests
- Test complete user workflows
- Use Cypress for web testing

## 📚 Additional Resources

- [API Reference](api-reference.md)
- [Database Schema](database-schema.md)
- [Deployment Guide](deployment-guide.md)
- [Troubleshooting](troubleshooting.md)