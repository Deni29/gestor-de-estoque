# Guia de Deployment - Sistema de Gestão de Stock

## Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Inicial](#configuração-inicial)
3. [Deploy Backend](#deploy-backend)
4. [Deploy Frontend Web](#deploy-frontend-web)
5. [Deploy Mobile](#deploy-mobile)
6. [Configuração de Base de Dados](#configuração-de-base-de-dados)
7. [Monitorização e Logs](#monitorização-e-logs)
8. [SSL/HTTPS](#ssl-https)
9. [CI/CD Pipeline](#ci-cd-pipeline)
10. [Troubleshooting](#troubleshooting)

## Pré-requisitos

### Contas e Serviços Necessários
- **Google Cloud Platform** (projeto configurado)
- **Firebase** (projeto configurado)
- **Docker Hub** ou **Google Container Registry**
- **GitHub** (para repositório e CI/CD)
- **Domínio** registado (para produção)
- **Cloudflare** (opcional, para CDN e proteção)

### Ferramentas Locais
```bash
# Instalar ferramentas necessárias
npm install -g firebase-tools
npm install -g @google-cloud/cli

# Verificar instalações
node --version    # >= 18.0.0
npm --version     # >= 8.0.0
docker --version  # >= 20.0.0
flutter --version # >= 3.10.0 (para mobile)
firebase --version
gcloud --version
```

### Configuração GCP
```bash
# Autenticar no Google Cloud
gcloud auth login
gcloud auth application-default login

# Configurar projeto
gcloud config set project YOUR_PROJECT_ID
gcloud config set compute/region europe-west1
gcloud config set compute/zone europe-west1-b

# Ativar APIs necessárias
gcloud services enable container.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql-admin.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
```

### Configuração Firebase
```bash
# Login Firebase
firebase login

# Configurar projeto
firebase use --add YOUR_PROJECT_ID

# Verificar configuração
firebase projects:list
```

## Configuração Inicial

### 1. Variáveis de Ambiente

#### Secrets do Google Cloud
```bash
# Criar secrets no Secret Manager
echo -n "your-super-secret-jwt-key" | gcloud secrets create jwt-secret --data-file=-
echo -n "your-encryption-key-32-chars" | gcloud secrets create field-encryption-key --data-file=-
echo -n "your-firebase-private-key" | gcloud secrets create firebase-private-key --data-file=-

# Verificar secrets criados
gcloud secrets list
```

#### Arquivo de Configuração (.env.production)
```env
# Ambiente
NODE_ENV=production
PORT=8080
APP_VERSION=1.0.0

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xyz@your-project.iam.gserviceaccount.com

# Base de Dados
POSTGRES_HOST=your-postgres-host
POSTGRES_DB=stock_analytics
POSTGRES_USER=analytics_user
POSTGRES_PORT=5432

# Cache e Search
REDIS_URL=redis://your-redis-host:6379
ELASTICSEARCH_URL=https://your-elasticsearch-host:9200

# Security
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
SESSION_SECRET=your-session-secret

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_ENABLED=true
DLP_BLOCK_ENABLED=true
```

### 2. Configuração Docker Registry
```bash
# Configurar Docker para GCR
gcloud auth configure-docker

# Ou para Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

## Deploy Backend

### 1. Preparação das Imagens Docker

#### Dockerfile Otimizado para Produção
```dockerfile
# backend/products/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app

# Instalar dependências apenas de produção
FROM base AS deps
COPY package*.json ./
COPY ../shared/package*.json ../shared/
RUN npm ci --only=production --ignore-scripts

# Build da aplicação
FROM base AS builder
COPY package*.json ./
COPY ../shared ../shared
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Imagem final de produção
FROM node:18-alpine AS production
WORKDIR /app

# Criar utilizador não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar ficheiros necessários
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Configurar permissões
RUN chown -R nodejs:nodejs /app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

#### Script de Build Automatizado
```bash
#!/bin/bash
# scripts/build-images.sh

set -e

PROJECT_ID="your-project-id"
REGION="europe-west1"
REPOSITORY="stock-management"

SERVICES=("products" "stock" "suppliers" "customers" "reports" "auth")

echo "🔨 Building Docker images..."

for service in "${SERVICES[@]}"; do
  echo "Building $service service..."
  
  # Build image
  docker build \
    -t "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${service}-service:latest" \
    -t "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${service}-service:$(git rev-parse --short HEAD)" \
    backend/${service}/
  
  # Push image
  docker push "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${service}-service:latest"
  docker push "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${service}-service:$(git rev-parse --short HEAD)"
  
  echo "✅ $service service built and pushed"
done

echo "🎉 All images built successfully!"
```

### 2. Deploy para Cloud Run

#### Configuração Cloud Run
```yaml
# backend/products/service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: products-service
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/execution-environment: gen2
    run.googleapis.com/cpu-throttling: "false"
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "100"
        run.googleapis.com/vpc-access-connector: projects/YOUR_PROJECT/locations/europe-west1/connectors/default-connector
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      serviceAccountName: products-service@YOUR_PROJECT.iam.gserviceaccount.com
      containers:
      - image: europe-west1-docker.pkg.dev/YOUR_PROJECT/stock-management/products-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: FIREBASE_PROJECT_ID
          value: "YOUR_PROJECT"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: latest
        - name: FIELD_ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: field-encryption-key
              key: latest
        resources:
          limits:
            cpu: "2"
            memory: "2Gi"
          requests:
            cpu: "1"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Script de Deploy
```bash
#!/bin/bash
# scripts/deploy-backend.sh

set -e

PROJECT_ID="your-project-id"
REGION="europe-west1"

SERVICES=("products" "stock" "suppliers" "customers" "reports" "auth")

echo "🚀 Deploying backend services to Cloud Run..."

for service in "${SERVICES[@]}"; do
  echo "Deploying $service service..."
  
  gcloud run deploy ${service}-service \
    --image europe-west1-docker.pkg.dev/${PROJECT_ID}/stock-management/${service}-service:latest \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --service-account ${service}-service@${PROJECT_ID}.iam.gserviceaccount.com \
    --set-env-vars NODE_ENV=production \
    --set-env-vars FIREBASE_PROJECT_ID=${PROJECT_ID} \
    --set-secrets JWT_SECRET=jwt-secret:latest \
    --set-secrets FIELD_ENCRYPTION_KEY=field-encryption-key:latest \
    --memory 512Mi \
    --cpu 1 \
    --concurrency 100 \
    --max-instances 100 \
    --min-instances 1 \
    --timeout 300 \
    --port 8080 \
    --vpc-connector default-connector \
    --vpc-egress all-traffic
  
  echo "✅ $service service deployed"
done

echo "🎉 All backend services deployed successfully!"
```

### 3. API Gateway com Cloud Load Balancer

#### Configuração do Load Balancer
```bash
# Criar backend services
for service in products stock suppliers customers reports auth; do
  gcloud compute backend-services create ${service}-backend \
    --global \
    --protocol HTTP \
    --port-name http \
    --health-checks ${service}-health-check
    
  # Adicionar Cloud Run como backend
  gcloud compute backend-services add-backend ${service}-backend \
    --global \
    --network-endpoint-group ${service}-neg \
    --network-endpoint-group-region ${REGION}
done

# Criar URL map
gcloud compute url-maps create api-gateway-map \
  --default-backend-service products-backend

# Adicionar path matchers
gcloud compute url-maps add-path-matcher api-gateway-map \
  --path-matcher-name api-matcher \
  --default-backend-service products-backend \
  --path-rules "/api/products/*=products-backend,/api/stock/*=stock-backend,/api/suppliers/*=suppliers-backend"

# Criar proxy HTTPS
gcloud compute target-https-proxies create api-gateway-proxy \
  --url-map api-gateway-map \
  --ssl-certificates api-ssl-cert

# Criar forwarding rule
gcloud compute forwarding-rules create api-gateway-rule \
  --global \
  --target-https-proxy api-gateway-proxy \
  --ports 443
```

#### Configuração Nginx (Alternativa)
```nginx
# nginx/nginx.conf
upstream products_service {
    server products-service-url.run.app:443;
}

upstream stock_service {
    server stock-service-url.run.app:443;
}

upstream suppliers_service {
    server suppliers-service-url.run.app:443;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    # Products API
    location /api/products {
        proxy_pass https://products_service;
        proxy_ssl_server_name on;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
    }

    # Stock API
    location /api/stock {
        proxy_pass https://stock_service;
        proxy_ssl_server_name on;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$host$request_uri;
    }
}
```

## Deploy Frontend Web

### 1. Build de Produção

#### Configuração Vite Otimizada
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.yourdomain\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@mui/icons-material'],
          charts: ['recharts'],
          utils: ['date-fns', 'lodash']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
});
```

#### Script de Build
```bash
#!/bin/bash
# scripts/build-frontend.sh

set -e

echo "🔨 Building frontend application..."

cd frontend/web

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --silent

# Run linting
echo "🔍 Running linting..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm run test:ci

# Build application
echo "🏗️ Building application..."
npm run build

# Analyze bundle size
echo "📊 Analyzing bundle size..."
npm run analyze

# Optimize images
echo "🖼️ Optimizing images..."
find build/static -name "*.png" -exec optipng {} \;
find build/static -name "*.jpg" -exec jpegoptim --max=85 {} \;

echo "✅ Frontend build completed!"
```

### 2. Deploy para Firebase Hosting

#### Configuração Firebase Hosting
```json
{
  "hosting": {
    "public": "frontend/web/build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/static/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ],
    "predeploy": [
      "npm --prefix frontend/web run build"
    ]
  }
}
```

#### Script de Deploy
```bash
#!/bin/bash
# scripts/deploy-frontend.sh

set -e

echo "🚀 Deploying frontend to Firebase Hosting..."

# Build application
./scripts/build-frontend.sh

# Deploy to Firebase
firebase deploy --only hosting --project production

# Invalidate CDN cache if using Cloudflare
if [ ! -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "🔄 Invalidating Cloudflare cache..."
  curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}'
fi

echo "✅ Frontend deployed successfully!"
```

### 3. CDN e Otimização (Cloudflare)

#### Configuração Cloudflare
```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Security headers
  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
  
  // Cache static assets aggressively
  if (url.pathname.startsWith('/static/') || 
      url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
    const cacheKey = new Request(url.toString(), request)
    const cache = caches.default
    
    let response = await cache.match(cacheKey)
    if (!response) {
      response = await fetch(request)
      if (response.status === 200) {
        const headers = new Headers(response.headers)
        headers.set('Cache-Control', 'public, max-age=31536000, immutable')
        Object.entries(securityHeaders).forEach(([key, value]) => {
          headers.set(key, value)
        })
        
        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        })
        
        await cache.put(cacheKey, response.clone())
      }
    }
    return response
  }
  
  // For HTML pages, add security headers
  const response = await fetch(request)
  const headers = new Headers(response.headers)
  Object.entries(securityHeaders).forEach(([key, value]) => {
    headers.set(key, value)
  })
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}
```

## Deploy Mobile

### 1. Android

#### Configuração Gradle de Produção
```gradle
// android/app/build.gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.stockmanagement.app"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
        multiDexEnabled true
    }

    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### Script de Build Android
```bash
#!/bin/bash
# scripts/build-android.sh

set -e

echo "🤖 Building Android application..."

cd frontend/mobile

# Clean previous builds
flutter clean
flutter pub get

# Build App Bundle (recommended for Play Store)
echo "📦 Building App Bundle..."
flutter build appbundle --release \
  --dart-define=ENVIRONMENT=production \
  --dart-define=API_URL=https://api.yourdomain.com

# Build APK for testing
echo "📱 Building APK..."
flutter build apk --release \
  --dart-define=ENVIRONMENT=production \
  --dart-define=API_URL=https://api.yourdomain.com

# Sign APK (if not using App Bundle)
if [ -f "$ANDROID_KEYSTORE" ]; then
  echo "✍️ Signing APK..."
  jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
    -keystore "$ANDROID_KEYSTORE" \
    build/app/outputs/flutter-apk/app-release.apk \
    "$ANDROID_KEY_ALIAS"
fi

echo "✅ Android build completed!"
echo "📦 App Bundle: build/app/outputs/bundle/release/app-release.aab"
echo "📱 APK: build/app/outputs/flutter-apk/app-release.apk"
```

#### Upload para Google Play
```bash
#!/bin/bash
# scripts/deploy-android.sh

set -e

echo "🚀 Deploying to Google Play Store..."

# Build application
./scripts/build-android.sh

# Upload using Google Play Developer API
if [ ! -z "$GOOGLE_PLAY_SERVICE_ACCOUNT" ]; then
  echo "📤 Uploading to Play Console..."
  
  # Use fastlane or Google Play Developer API
  fastlane android deploy \
    package_name:com.stockmanagement.app \
    json_key:$GOOGLE_PLAY_SERVICE_ACCOUNT \
    aab:build/app/outputs/bundle/release/app-release.aab \
    track:production
else
  echo "⚠️ Manual upload required to Google Play Console"
  echo "Upload file: build/app/outputs/bundle/release/app-release.aab"
fi

echo "✅ Android deployment completed!"
```

### 2. iOS

#### Configuração Xcode
```ruby
# ios/Podfile
platform :ios, '12.0'

# CocoaPods analytics sends network stats synchronously affecting flutter build latency.
ENV['COCOAPODS_DISABLE_STATS'] = 'true'

project 'Runner', {
  'Debug' => :debug,
  'Profile' => :release,
  'Release' => :release,
}

def flutter_root
  generated_xcode_build_settings_path = File.expand_path(File.join('..', 'Flutter', 'Generated.xcconfig'), __FILE__)
  unless File.exist?(generated_xcode_build_settings_path)
    raise "#{generated_xcode_build_settings_path} must exist. If you're running pod install manually, make sure flutter pub get is executed first"
  end

  File.foreach(generated_xcode_build_settings_path) do |line|
    matches = line.match(/FLUTTER_ROOT\=(.*)/)
    return matches[1].strip if matches
  end
  raise "FLUTTER_ROOT not found in #{generated_xcode_build_settings_path}. Try deleting Generated.xcconfig, then run flutter pub get"
end

require File.expand_path(File.join('packages', 'flutter_tools', 'bin', 'podhelper'), flutter_root)

flutter_ios_podfile_setup

target 'Runner' do
  use_frameworks!
  use_modular_headers!

  flutter_install_all_ios_pods File.dirname(File.realpath(__FILE__))
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '12.0'
    end
  end
end
```

#### Script de Build iOS
```bash
#!/bin/bash
# scripts/build-ios.sh

set -e

echo "🍎 Building iOS application..."

cd frontend/mobile

# Clean previous builds
flutter clean
flutter pub get
cd ios && pod install && cd ..

# Build iOS
echo "📱 Building iOS app..."
flutter build ios --release \
  --dart-define=ENVIRONMENT=production \
  --dart-define=API_URL=https://api.yourdomain.com

# Archive and export (requires macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "📦 Creating archive..."
  cd ios
  
  xcodebuild -workspace Runner.xcworkspace \
    -scheme Runner \
    -configuration Release \
    -destination generic/platform=iOS \
    -archivePath build/Runner.xcarchive \
    archive
  
  # Export IPA
  echo "📤 Exporting IPA..."
  xcodebuild -exportArchive \
    -archivePath build/Runner.xcarchive \
    -exportPath build/ \
    -exportOptionsPlist ExportOptions.plist
  
  cd ..
else
  echo "⚠️ iOS build requires macOS. Archive manually in Xcode."
fi

echo "✅ iOS build completed!"
```

### 3. CI/CD para Mobile

#### GitHub Actions
```yaml
# .github/workflows/mobile-deploy.yml
name: Mobile Deploy

on:
  push:
    tags:
      - 'mobile-v*'

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Java
      uses: actions/setup-java@v3
      with:
        distribution: 'zulu'
        java-version: '17'
    
    - name: Setup Flutter
      uses: subosito/flutter-action@v2
      with:
        flutter-version: '3.16.0'
        channel: 'stable'
    
    - name: Get dependencies
      run: |
        cd frontend/mobile
        flutter pub get
    
    - name: Run tests
      run: |
        cd frontend/mobile
        flutter test
    
    - name: Build App Bundle
      run: |
        cd frontend/mobile
        flutter build appbundle --release \
          --dart-define=ENVIRONMENT=production \
          --dart-define=API_URL=https://api.yourdomain.com
    
    - name: Upload to Play Store
      uses: r0adkll/upload-google-play@v1
      with:
        serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
        packageName: com.stockmanagement.app
        releaseFiles: frontend/mobile/build/app/outputs/bundle/release/app-release.aab
        track: production

  build-ios:
    runs-on: macos-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Flutter
      uses: subosito/flutter-action@v2
      with:
        flutter-version: '3.16.0'
        channel: 'stable'
    
    - name: Get dependencies
      run: |
        cd frontend/mobile
        flutter pub get
        cd ios && pod install
    
    - name: Build iOS
      run: |
        cd frontend/mobile
        flutter build ios --release --no-codesign \
          --dart-define=ENVIRONMENT=production \
          --dart-define=API_URL=https://api.yourdomain.com
    
    - name: Upload to App Store
      uses: apple-actions/upload-testflight-build@v1
      with:
        app-path: frontend/mobile/build/ios/iphoneos/Runner.app
        issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
        api-key-id: ${{ secrets.APPSTORE_API_KEY_ID }}
        api-private-key: ${{ secrets.APPSTORE_API_PRIVATE_KEY }}
```

## Configuração de Base de Dados

### 1. Firestore

#### Deploy das Security Rules
```bash
#!/bin/bash
# scripts/deploy-firestore.sh

set -e

echo "🔥 Deploying Firestore configuration..."

# Deploy security rules
echo "🛡️ Deploying security rules..."
firebase deploy --only firestore:rules --project production

# Deploy indexes
echo "📊 Deploying indexes..."
firebase deploy --only firestore:indexes --project production

# Backup current data
echo "💾 Creating backup..."
gcloud firestore export gs://your-backup-bucket/backup-$(date +%Y%m%d-%H%M%S) \
  --project your-project-id

echo "✅ Firestore configuration deployed!"
```

#### Monitorização Firestore
```typescript
// scripts/firestore-monitor.ts
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Monitor document writes
export const monitorFirestore = () => {
  const collections = ['products', 'stockMovements', 'users', 'auditLogs'];
  
  collections.forEach(collection => {
    db.collection(collection).onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          console.log(`New ${collection} document:`, change.doc.id);
        } else if (change.type === 'modified') {
          console.log(`Modified ${collection} document:`, change.doc.id);
        } else if (change.type === 'removed') {
          console.log(`Removed ${collection} document:`, change.doc.id);
        }
      });
    });
  });
};
```

### 2. PostgreSQL (Analytics)

#### Setup Cloud SQL
```bash
#!/bin/bash
# scripts/setup-cloudsql.sh

set -e

PROJECT_ID="your-project-id"
REGION="europe-west1"
INSTANCE_NAME="stock-analytics"

echo "🐘 Setting up Cloud SQL PostgreSQL..."

# Create instance
gcloud sql instances create $INSTANCE_NAME \
  --database-version=POSTGRES_15 \
  --tier=db-n1-standard-2 \
  --region=$REGION \
  --storage-type=SSD \
  --storage-size=100GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04 \
  --deletion-protection

# Create database
gcloud sql databases create analytics \
  --instance=$INSTANCE_NAME

# Create user
gcloud sql users create analytics-user \
  --instance=$INSTANCE_NAME \
  --password=$(openssl rand -base64 32)

# Create connection
gcloud sql instances patch $INSTANCE_NAME \
  --authorized-networks=0.0.0.0/0

echo "✅ Cloud SQL setup completed!"
```

#### Migrations
```sql
-- migrations/001_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Analytics events table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    product_id VARCHAR(100),
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_product ON analytics_events(product_id);

-- Dashboard cache table
CREATE TABLE dashboard_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    data JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dashboard_cache_expires ON dashboard_cache(expires_at);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type VARCHAR(100) NOT NULL,
    parameters JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    file_url VARCHAR(500),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_by ON reports(created_by);
```

## Monitorização e Logs

### 1. Cloud Monitoring

#### Configuração de Alertas
```yaml
# monitoring/alerts.yaml
displayName: "Stock Management Alerts"
combiner: OR
conditions:
  - displayName: "High Error Rate"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 0.05
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
          crossSeriesReducer: REDUCE_MEAN
  
  - displayName: "High Response Time"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 2000
      duration: 300s

notificationChannels:
  - projects/YOUR_PROJECT/notificationChannels/CHANNEL_ID

alertStrategy:
  autoClose: 1800s
```

#### Dashboard Personalizado
```json
{
  "displayName": "Stock Management Dashboard",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Rate",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      {
        "width": 6,
        "height": 4,
        "xPos": 6,
        "widget": {
          "title": "Error Rate",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE"
                    }
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
```

### 2. Structured Logging

#### Configuração Winston
```typescript
// backend/shared/src/utils/logger.ts
import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

const loggingWinston = new LoggingWinston({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  logName: 'stock-management',
  resource: {
    type: 'cloud_run_revision',
    labels: {
      service_name: process.env.K_SERVICE || 'unknown',
      revision_name: process.env.K_REVISION || 'unknown'
    }
  }
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'stock-management',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    loggingWinston
  ]
});

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger.log(logLevel, 'HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.uid
    });
  });
  
  next();
};
```

## SSL/HTTPS

### 1. Certificados SSL

#### Let's Encrypt com Certbot
```bash
#!/bin/bash
# scripts/setup-ssl.sh

set -e

DOMAIN="yourdomain.com"
EMAIL="admin@yourdomain.com"

echo "🔒 Setting up SSL certificates..."

# Install certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email $EMAIL \
  -d $DOMAIN \
  -d api.$DOMAIN \
  -d app.$DOMAIN

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

echo "✅ SSL certificates configured!"
```

#### Google Managed SSL
```bash
# Create managed SSL certificate
gcloud compute ssl-certificates create stock-management-ssl \
  --domains=yourdomain.com,api.yourdomain.com,app.yourdomain.com \
  --global

# Check certificate status
gcloud compute ssl-certificates list
```

### 2. HTTPS Redirection

#### Cloud Load Balancer HTTPS Redirect
```bash
# Create HTTP to HTTPS redirect
gcloud compute url-maps create https-redirect \
  --default-backend-service=products-backend

gcloud compute url-maps add-host-rule https-redirect \
  --hosts=yourdomain.com,api.yourdomain.com \
  --path-matcher-name=redirect-matcher

gcloud compute url-maps add-path-matcher https-redirect \
  --path-matcher-name=redirect-matcher \
  --default-url-redirect-https-redirect

gcloud compute target-http-proxies create http-redirect-proxy \
  --url-map=https-redirect

gcloud compute forwarding-rules create http-redirect-rule \
  --global \
  --target-http-proxy=http-redirect-proxy \
  --ports=80
```

## CI/CD Pipeline

### 1. GitHub Actions

#### Complete Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: europe-west1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        cd backend/shared && npm ci
        cd ../products && npm ci
        cd ../../frontend/web && npm ci
    
    - name: Run linting
      run: |
        npm run lint
        cd frontend/web && npm run lint
    
    - name: Run tests
      run: |
        npm run test
        cd frontend/web && npm run test:ci

  build-backend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: ${{ secrets.GCP_PROJECT_ID }}
    
    - name: Configure Docker
      run: gcloud auth configure-docker europe-west1-docker.pkg.dev
    
    - name: Build and push images
      run: ./scripts/build-images.sh
    
    - name: Deploy to Cloud Run
      run: ./scripts/deploy-backend.sh

  build-frontend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Build frontend
      run: ./scripts/build-frontend.sh
    
    - name: Setup Firebase CLI
      run: npm install -g firebase-tools
    
    - name: Deploy to Firebase Hosting
      run: |
        echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}' > firebase-service-account.json
        export GOOGLE_APPLICATION_CREDENTIALS=firebase-service-account.json
        firebase deploy --only hosting --project production --non-interactive

  deploy-database:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Firebase CLI
      run: npm install -g firebase-tools
    
    - name: Deploy Firestore configuration
      run: |
        echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}' > firebase-service-account.json
        export GOOGLE_APPLICATION_CREDENTIALS=firebase-service-account.json
        firebase deploy --only firestore --project production --non-interactive

  notify:
    needs: [build-backend, build-frontend, deploy-database]
    if: always()
    runs-on: ubuntu-latest
    steps:
    - name: Notify deployment status
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        text: |
          Deployment to production: ${{ job.status }}
          Backend: ${{ needs.build-backend.result }}
          Frontend: ${{ needs.build-frontend.result }}
          Database: ${{ needs.deploy-database.result }}
```

### 2. Deployment Scripts

#### Master Deployment Script
```bash
#!/bin/bash
# scripts/deploy-all.sh

set -e

ENVIRONMENT=${1:-production}
VERSION=${2:-$(git rev-parse --short HEAD)}

echo "🚀 Deploying Stock Management System"
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."
./scripts/pre-deployment-checks.sh

# Build and deploy backend
echo "🏗️ Building and deploying backend..."
./scripts/build-images.sh
./scripts/deploy-backend.sh

# Build and deploy frontend
echo "🎨 Building and deploying frontend..."
./scripts/build-frontend.sh
./scripts/deploy-frontend.sh

# Deploy database configuration
echo "💾 Deploying database configuration..."
./scripts/deploy-firestore.sh

# Run post-deployment tests
echo "🧪 Running post-deployment tests..."
./scripts/post-deployment-tests.sh

# Update monitoring
echo "📊 Updating monitoring configuration..."
./scripts/update-monitoring.sh

echo "✅ Deployment completed successfully!"
echo "🌐 Application: https://app.yourdomain.com"
echo "📡 API: https://api.yourdomain.com"
echo "📊 Monitoring: https://console.cloud.google.com/monitoring"
```

## Troubleshooting

### 1. Common Issues

#### Cloud Run Deployment Fails
```bash
# Check service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=products-service" --limit=50

# Check service status
gcloud run services describe products-service --region=europe-west1

# Rollback if necessary
gcloud run services update-traffic products-service --to-revisions=PREVIOUS_REVISION=100 --region=europe-west1
```

#### Firebase Hosting Issues
```bash
# Check hosting status
firebase hosting:sites:list

# View deployment history
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION_ID TARGET_SITE_ID

# Rollback deployment
firebase hosting:rollback --site=your-site-id
```

#### SSL Certificate Issues
```bash
# Check certificate status
gcloud compute ssl-certificates list

# View certificate details
gcloud compute ssl-certificates describe certificate-name

# Update certificate domains
gcloud compute ssl-certificates create new-certificate --domains=yourdomain.com,api.yourdomain.com
```

### 2. Health Checks

#### Comprehensive Health Check
```typescript
// backend/shared/src/utils/healthcheck.ts
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

export const healthCheck = async (req: Request, res: Response) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {}
  };

  try {
    // Database connectivity
    const db = getFirestore();
    await db.collection('health').doc('check').get();
    checks.checks.database = 'ok';
  } catch (error) {
    checks.checks.database = 'error';
    checks.status = 'unhealthy';
  }

  try {
    // External API connectivity
    const response = await fetch('https://api.example.com/health', {
      timeout: 5000
    });
    checks.checks.externalApi = response.ok ? 'ok' : 'error';
  } catch (error) {
    checks.checks.externalApi = 'error';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
};
```

#### Monitoring Script
```bash
#!/bin/bash
# scripts/monitor-health.sh

SERVICES=("products" "stock" "suppliers" "customers" "reports" "auth")
BASE_URL="https://api.yourdomain.com"

echo "🏥 Health Check Report - $(date)"
echo "================================"

for service in "${SERVICES[@]}"; do
  echo -n "Checking $service service... "
  
  response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/$service/health")
  
  if [ "$response" = "200" ]; then
    echo "✅ OK"
  else
    echo "❌ FAILED (HTTP $response)"
  fi
done

echo "================================"
echo "Frontend health check..."
response=$(curl -s -o /dev/null -w "%{http_code}" "https://app.yourdomain.com")
if [ "$response" = "200" ]; then
  echo "✅ Frontend OK"
else
  echo "❌ Frontend FAILED (HTTP $response)"
fi
```

Este guia de deployment fornece uma base completa para fazer deploy do Sistema de Gestão de Stock em produção com todas as melhores práticas de segurança, monitorização e automação.