# Troubleshooting Guide

This guide helps resolve common issues encountered while developing, deploying, or using the Stock Management System.

## 🐛 Common Development Issues

### Node.js and npm Issues

#### Error: `npm install` fails with permission errors

**Problem:** Permission denied when installing packages globally.

**Solution:**
```bash
# Use npm's built-in solution
npm config set prefix ~/.local
export PATH=$PATH:~/.local/bin

# Or use a Node version manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Error: `ENOSPC: System limit for number of file watchers reached`

**Problem:** Too many files being watched in development mode.

**Solution:**
```bash
# Increase the limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Firebase Issues

#### Error: `Firebase project not found`

**Problem:** Firebase project is not properly configured.

**Solution:**
```bash
# Login to Firebase
firebase login

# List available projects
firebase projects:list

# Use specific project
firebase use your-project-id

# Verify configuration
cat .firebaserc
```

#### Error: `Permission denied` when accessing Firestore

**Problem:** Firebase security rules are too restrictive.

**Solution:**
1. Check Firestore rules in Firebase Console
2. Update rules for development:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Docker Issues

#### Error: `docker: permission denied`

**Problem:** User doesn't have permission to run Docker commands.

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again, or run:
newgrp docker
```

#### Error: `Port already in use`

**Problem:** Another service is using the required port.

**Solution:**
```bash
# Find process using the port
sudo netstat -tulpn | grep :8080

# Kill the process
sudo kill -9 <process-id>

# Or use a different port
export PORT=8081
```

## 🔧 Backend Service Issues

### API Service Not Starting

#### Error: `Cannot find module '../shared'`

**Problem:** Shared library is not built or linked properly.

**Solution:**
```bash
# Build shared library first
cd backend/shared
npm install
npm run build

# Install in other services
cd ../products
npm install ../shared
```

#### Error: `Firebase Admin SDK initialization failed`

**Problem:** Firebase service account key is missing or invalid.

**Solution:**
1. Download service account key from Firebase Console
2. Set environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Database Connection Issues

#### Error: `Connection to database failed`

**Problem:** Database is not running or connection string is incorrect.

**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Test connection
psql -h localhost -U username -d database_name
```

#### Error: `SSL connection required`

**Problem:** Database requires SSL connection.

**Solution:**
```bash
# Update connection string
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
```

## 🌐 Frontend Issues

### React Development Server Issues

#### Error: `Module not found: Can't resolve '@/components'`

**Problem:** Path aliases are not configured properly.

**Solution:**
1. Check `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

2. Check `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### Error: `Network Error` when calling APIs

**Problem:** CORS or proxy configuration issue.

**Solution:**
1. Update `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

### Authentication Issues

#### Error: `Firebase Auth: Network request failed`

**Problem:** Firebase configuration is incorrect or network issues.

**Solution:**
1. Check Firebase config:
```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};
```

2. Check browser network tab for errors
3. Verify Firebase project settings

## 📱 Mobile App Issues

### Flutter Development Issues

#### Error: `Gradle build failed`

**Problem:** Android build configuration issues.

**Solution:**
```bash
# Clean build cache
flutter clean
cd android
./gradlew clean
cd ..

# Get dependencies
flutter pub get

# Try building again
flutter build apk
```

#### Error: `CocoaPods not installed`

**Problem:** iOS dependencies are not installed.

**Solution:**
```bash
# Install CocoaPods
sudo gem install cocoapods

# Install iOS dependencies
cd ios
pod install
cd ..
```

## 🚀 Deployment Issues

### Docker Deployment

#### Error: `Container exits immediately`

**Problem:** Application crashes on startup.

**Solution:**
```bash
# Check container logs
docker logs container-name

# Run container interactively
docker run -it image-name /bin/bash

# Check environment variables
docker exec container-name env
```

#### Error: `Health check failed`

**Problem:** Health check endpoint is not responding.

**Solution:**
1. Check if the service is running:
```bash
docker exec container-name ps aux
```

2. Test health endpoint manually:
```bash
docker exec container-name curl http://localhost:8080/health
```

### Firebase Hosting

#### Error: `Build failed` during deployment

**Problem:** Build process encounters errors.

**Solution:**
```bash
# Build locally first
npm run build

# Check for errors
npm run lint
npm run type-check

# Deploy with debug
firebase deploy --debug
```

## 📊 Performance Issues

### Slow API Responses

#### Database Query Performance

**Problem:** Slow database queries.

**Solution:**
1. Add database indexes:
```sql
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
```

2. Optimize queries:
```typescript
// Use pagination
const products = await db.products
  .limit(20)
  .offset(page * 20)
  .get();

// Use specific fields
const products = await db.products
  .select(['id', 'name', 'sku'])
  .get();
```

#### Memory Leaks

**Problem:** Node.js process memory usage keeps growing.

**Solution:**
1. Monitor memory usage:
```bash
# Install clinic.js
npm install -g clinic

# Profile memory
clinic bubbleprof -- node server.js
```

2. Common fixes:
```typescript
// Remove event listeners
process.removeListener('SIGINT', handler);

// Clear intervals
clearInterval(intervalId);

// Close database connections
await db.close();
```

### Frontend Performance

#### Slow Page Load Times

**Problem:** Large bundle size or unoptimized assets.

**Solution:**
1. Analyze bundle size:
```bash
npm run build -- --analyze
```

2. Implement code splitting:
```typescript
// Lazy load components
const LazyComponent = lazy(() => import('./Component'));

// Use Suspense
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

## 🔐 Security Issues

### Authentication Problems

#### Error: `JWT token expired`

**Problem:** Token has expired and needs refresh.

**Solution:**
```typescript
// Implement token refresh
async function refreshToken() {
  try {
    const user = firebase.auth().currentUser;
    if (user) {
      const token = await user.getIdToken(true);
      // Update token in API client
      apiClient.setToken(token);
    }
  } catch (error) {
    // Redirect to login
    router.push('/login');
  }
}
```

### CORS Issues

#### Error: `Access to fetch blocked by CORS`

**Problem:** Cross-origin requests are blocked.

**Solution:**
1. Configure CORS in backend:
```typescript
import cors from 'cors';

app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true,
}));
```

## 📞 Getting Help

### Debug Information to Collect

When reporting issues, include:

1. **Environment Information:**
```bash
# Node.js version
node --version

# npm version
npm --version

# OS information
uname -a

# Docker version (if using Docker)
docker --version
```

2. **Error Logs:**
```bash
# Application logs
cat logs/app.log

# Docker logs
docker logs container-name

# System logs
journalctl -u service-name
```

3. **Configuration:**
```bash
# Package versions
npm list

# Environment variables (without sensitive data)
env | grep -v SECRET | grep -v PASSWORD
```

### Support Channels

- **GitHub Issues**: [Create an issue](https://github.com/org/stock-management/issues)
- **Email**: support@stockmanagement.com
- **Documentation**: Check other sections of this documentation

### Useful Commands

```bash
# Check service status
systemctl status service-name

# Monitor real-time logs
tail -f logs/app.log

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check network connections
netstat -tulpn

# Test API endpoints
curl -X GET http://localhost:8080/health

# Check Firebase emulator status
firebase emulators:start --only firestore
```