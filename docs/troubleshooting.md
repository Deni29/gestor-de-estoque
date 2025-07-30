# Guia de Troubleshooting - Sistema de Gestão de Stock

## Índice
1. [Problemas Comuns](#problemas-comuns)
2. [Backend Issues](#backend-issues)
3. [Frontend Issues](#frontend-issues)
4. [Mobile Issues](#mobile-issues)
5. [Base de Dados](#base-de-dados)
6. [Performance](#performance)
7. [Segurança](#segurança)
8. [Infraestrutura](#infraestrutura)
9. [Ferramentas de Debug](#ferramentas-de-debug)
10. [Logs e Monitorização](#logs-e-monitorização)

## Problemas Comuns

### 1. Erro de Autenticação (401 Unauthorized)

**Sintomas:**
- `401 Unauthorized` nas chamadas API
- Token inválido ou expirado
- Utilizador não consegue fazer login

**Diagnóstico:**
```bash
# Verificar token manualmente
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.yourdomain.com/api/products

# Verificar configuração Firebase
firebase auth:export users.json --project your-project

# Verificar logs de autenticação
gcloud logging read "resource.type=cloud_run_revision AND textPayload:auth" --limit 20
```

**Soluções:**
```typescript
// Debug authentication no backend
app.use('/debug/auth', (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.json({ error: 'No token provided' });
  }
  
  admin.auth().verifyIdToken(token)
    .then(decodedToken => {
      res.json({ 
        valid: true, 
        uid: decodedToken.uid,
        email: decodedToken.email,
        exp: new Date(decodedToken.exp * 1000),
        iat: new Date(decodedToken.iat * 1000)
      });
    })
    .catch(error => {
      res.json({ 
        valid: false, 
        error: error.message 
      });
    });
});
```

**Verificações:**
- [ ] Firebase project ID correto
- [ ] Service account configurado
- [ ] Token não expirado
- [ ] Headers corretos no request

### 2. CORS Issues

**Sintoma:**
```
Access to fetch at 'https://api.yourdomain.com' from origin 'https://app.yourdomain.com' 
has been blocked by CORS policy
```

**Diagnóstico:**
```bash
# Testar CORS manualmente
curl -H "Origin: https://app.yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     https://api.yourdomain.com/api/products
```

**Solução:**
```typescript
// Configuração CORS correta
import cors from 'cors';

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://yourdomain.com',
    'https://app.yourdomain.com',
    'https://your-firebase-app.web.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept'
  ]
};

app.use(cors(corsOptions));

// Handle preflight requests explicitamente
app.options('*', cors(corsOptions));
```

### 3. Conectividade de Base de Dados

**Sintomas:**
- `Database connection failed`
- Timeouts em queries
- Firestore permission denied

**Diagnóstico:**
```bash
# Testar conexão Firestore
firebase firestore:indexes --project your-project

# Verificar regras de segurança
firebase firestore:rules:get --project your-project

# Testar conectividade de rede
nslookup firestore.googleapis.com
telnet firestore.googleapis.com 443
```

**Solução:**
```typescript
// Health check para Firestore
async function checkFirestoreHealth() {
  const start = Date.now();
  try {
    const testDoc = await db.collection('health').doc('test').get();
    const latency = Date.now() - start;
    
    return { 
      status: 'ok', 
      latency: `${latency}ms`,
      connected: true 
    };
  } catch (error) {
    return { 
      status: 'error', 
      message: error.message,
      connected: false
    };
  }
}

// Middleware para verificar conexão
app.use('/api', async (req, res, next) => {
  const health = await checkFirestoreHealth();
  if (!health.connected) {
    return res.status(503).json({
      error: 'Database unavailable',
      details: health
    });
  }
  next();
});
```

### 4. Rate Limiting Issues

**Sintomas:**
- `429 Too Many Requests`
- Requests bloqueados
- API lenta para alguns utilizadores

**Diagnóstico:**
```bash
# Verificar headers de rate limiting
curl -I https://api.yourdomain.com/api/products

# Verificar logs de rate limiting
gcloud logging read 'jsonPayload.message="Rate limit exceeded"' --limit 50
```

**Solução:**
```typescript
// Rate limiting com diferentes limites por role
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const createRateLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      // Use user ID se autenticado, senão IP
      return req.user?.uid || req.ip;
    },
    handler: (req, res) => {
      const resetTime = new Date(Date.now() + windowMs);
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(windowMs / 1000),
        resetTime: resetTime.toISOString()
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Diferentes limites por endpoint
app.use('/auth', createRateLimiter(15 * 60 * 1000, 5)); // 5 tentativas/15min
app.use('/api', createRateLimiter(60 * 1000, 100)); // 100 requests/min
```

## Backend Issues

### 1. Microsserviço Não Responde

**Diagnóstico:**
```bash
# Verificar status Cloud Run
gcloud run services list --region=europe-west1

# Verificar logs do serviço
gcloud run services logs read products-service --region=europe-west1

# Verificar health check
curl -f https://products-service-url/health || echo "Health check failed"

# Verificar recursos
gcloud run services describe products-service --region=europe-west1
```

**Soluções:**
```bash
# Reiniciar serviço
gcloud run services update products-service \
  --region=europe-west1 \
  --revision-suffix=$(date +%s)

# Aumentar recursos
gcloud run services update products-service \
  --region=europe-west1 \
  --memory=1Gi \
  --cpu=2 \
  --max-instances=20

# Rollback para versão anterior
gcloud run services update-traffic products-service \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=europe-west1
```

### 2. Memory/CPU Issues

**Diagnóstico:**
```typescript
// Monitor memory usage
const monitorResources = () => {
  setInterval(() => {
    const used = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const memoryMB = {
      rss: Math.round(used.rss / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024)
    };
    
    console.log('Memory usage (MB):', memoryMB);
    console.log('CPU usage:', cpuUsage);
    
    // Alert se uso de memória muito alto
    if (memoryMB.heapUsed > 400) {
      console.warn('High memory usage detected:', memoryMB);
    }
  }, 30000);
};

// Garbage collection forçado (apenas para debug)
if (global.gc && process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const before = process.memoryUsage().heapUsed;
    global.gc();
    const after = process.memoryUsage().heapUsed;
    console.log(`GC: Freed ${Math.round((before - after) / 1024 / 1024)}MB`);
  }, 60000);
}
```

**Otimizações:**
```typescript
// Configuração de timeout
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 segundos
  res.setTimeout(30000);
  next();
});

// Limitação de payload
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Streaming para uploads grandes
import multer from 'multer';
const upload = multer({
  dest: '/tmp/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});
```

### 3. Timeout Issues

**Configuração de Timeouts:**
```typescript
// Express timeouts
import timeout from 'connect-timeout';

app.use(timeout('30s'));
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// Database timeouts
const db = new Firestore({
  settings: {
    timeout: 10000 // 10 segundos
  }
});

// HTTP client timeouts
import axios from 'axios';

const apiClient = axios.create({
  timeout: 5000,
  retry: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000; // 1s, 2s, 3s
  }
});

// Implementar retry logic
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    
    if (!config || !config.retry) return Promise.reject(error);
    
    config.retryCount = config.retryCount || 0;
    
    if (config.retryCount >= config.retry) {
      return Promise.reject(error);
    }
    
    config.retryCount++;
    
    const delay = config.retryDelay ? config.retryDelay(config.retryCount) : 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return apiClient(config);
  }
);
```

### 4. Dependency Issues

**Package Conflicts:**
```bash
# Limpar cache npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Verificar vulnerabilidades
npm audit
npm audit fix

# Atualizar dependências
npm update
npx npm-check-updates -u
```

**Docker Build Issues:**
```dockerfile
# Multi-stage build otimizado
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
USER nodejs
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

## Frontend Issues

### 1. Build Failures

**Diagnóstico:**
```bash
# Build com debug detalhado
npm run build -- --verbose --debug

# Verificar espaço em disco
df -h

# Verificar memória disponível
free -h

# Limpar cache
npm cache clean --force
rm -rf node_modules/.cache
rm -rf build/ dist/
```

**Soluções Comuns:**
```bash
# Out of memory durante build
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# TypeScript errors
npx tsc --noEmit --skipLibCheck

# ESLint errors
npx eslint src/ --fix

# Dependency issues
rm -rf node_modules package-lock.json
npm install
```

**Configuração Vite Otimizada:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            if (id.includes('@mui')) {
              return 'mui';
            }
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### 2. Runtime Errors

**Error Boundaries:**
```tsx
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo } from 'react';

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Send to Sentry or similar
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { errorInfo }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Oops! Algo correu mal</h2>
          <p>Ocorreu um erro inesperado. Por favor, recarregue a página.</p>
          {process.env.NODE_ENV === 'development' && (
            <details>
              <summary>Detalhes do erro (desenvolvimento)</summary>
              <pre>{this.state.error?.stack}</pre>
              <pre>{this.state.errorInfo?.componentStack}</pre>
            </details>
          )}
          <button onClick={() => window.location.reload()}>
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Global Error Handling:**
```typescript
// utils/errorHandler.ts
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  // Send to monitoring
  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: event.error?.message || 'Unknown error',
      fatal: false
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Prevent default browser behavior
  event.preventDefault();
});
```

### 3. Performance Issues

**Bundle Analysis:**
```bash
# Analisar bundle size
npm run build
npx webpack-bundle-analyzer build/static/js/*.js

# Source map explorer
npm install -g source-map-explorer
source-map-explorer build/static/js/*.js
```

**Code Splitting:**
```tsx
// Lazy loading de componentes
import { lazy, Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';

const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const StockPage = lazy(() => import('./pages/StockPage'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/stock" element={<StockPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

**Memoization:**
```tsx
// Otimização de componentes
import { memo, useMemo, useCallback } from 'react';

const ProductCard = memo(({ product, onEdit, onDelete }) => {
  const formattedPrice = useMemo(() => 
    new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(product.price), 
    [product.price]
  );
  
  const handleEdit = useCallback(() => 
    onEdit(product.id), 
    [product.id, onEdit]
  );
  
  const handleDelete = useCallback(() => 
    onDelete(product.id), 
    [product.id, onDelete]
  );
  
  return (
    <Card>
      <h3>{product.name}</h3>
      <p>{formattedPrice}</p>
      <button onClick={handleEdit}>Editar</button>
      <button onClick={handleDelete}>Eliminar</button>
    </Card>
  );
});
```

### 4. API Connection Issues

**Debug API Calls:**
```typescript
// API interceptor para debugging
import axios from 'axios';

// Request interceptor
axios.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axios.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      url: error.config?.url,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);
```

**Retry Logic:**
```typescript
// Custom hook com retry
const useApiWithRetry = (apiCall: Function, maxRetries = 3) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await apiCall(...args);
        setData(result);
        setLoading(false);
        return result;
      } catch (err) {
        if (attempt === maxRetries) {
          setError(err);
          setLoading(false);
          throw err;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, [apiCall, maxRetries]);

  return { data, loading, error, execute };
};
```

## Mobile Issues

### 1. Flutter Build Issues

**Android Build Problems:**
```bash
# Clean build completo
cd frontend/mobile
flutter clean
cd android
./gradlew clean
cd ..
flutter pub get
flutter pub upgrade

# Verificar configuração Android
flutter doctor -v
flutter doctor --android-licenses

# Build com debug verbose
flutter build apk --debug --verbose
```

**iOS Build Problems:**
```bash
# Clean build iOS
cd frontend/mobile
flutter clean
cd ios
rm -rf Pods/ Podfile.lock
pod install --verbose
cd ..
flutter pub get

# Verificar configuração iOS
flutter doctor -v
open ios/Runner.xcworkspace
```

**Dependency Conflicts:**
```yaml
# pubspec.yaml - dependency overrides
dependency_overrides:
  meta: ^1.8.0
  collection: ^1.17.0
```

### 2. Firebase Integration Issues

**Debug Firebase Connection:**
```dart
// Verificar configuração Firebase
void debugFirebaseConfig() {
  print('Firebase App: ${Firebase.app().name}');
  print('Firebase Options: ${Firebase.app().options}');
  
  // Test Firestore connection
  FirebaseFirestore.instance
      .collection('test')
      .doc('connection')
      .get()
      .then((doc) => print('Firestore connected: ${doc.exists}'))
      .catchError((error) => print('Firestore error: $error'));
      
  // Test Auth
  FirebaseAuth.instance.authStateChanges().listen(
    (user) => print('Auth state: ${user?.uid ?? "not authenticated"}')
  );
}
```

**Emulator Configuration:**
```dart
// main.dart - emulator setup
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  // Use emulators em desenvolvimento
  if (kDebugMode) {
    try {
      await FirebaseAuth.instance.useAuthEmulator('localhost', 9099);
      FirebaseFirestore.instance.useFirestoreEmulator('localhost', 8080);
      await FirebaseStorage.instance.useStorageEmulator('localhost', 9199);
    } catch (e) {
      print('Emulator connection failed: $e');
    }
  }
  
  runApp(MyApp());
}
```

### 3. State Management Issues

**BLoC Debugging:**
```dart
// BLoC observer para debugging
class AppBlocObserver extends BlocObserver {
  @override
  void onCreate(BlocBase bloc) {
    super.onCreate(bloc);
    print('onCreate -- ${bloc.runtimeType}');
  }

  @override
  void onChange(BlocBase bloc, Change change) {
    super.onChange(bloc, change);
    print('onChange -- ${bloc.runtimeType}');
    print('Current State: ${change.currentState}');
    print('Next State: ${change.nextState}');
  }

  @override
  void onTransition(Bloc bloc, Transition transition) {
    super.onTransition(bloc, transition);
    print('onTransition -- ${bloc.runtimeType}');
    print('Event: ${transition.event}');
    print('Current State: ${transition.currentState}');
    print('Next State: ${transition.nextState}');
  }

  @override
  void onError(BlocBase bloc, Object error, StackTrace stackTrace) {
    print('onError -- ${bloc.runtimeType}, $error');
    super.onError(bloc, error, stackTrace);
  }
}

void main() {
  Bloc.observer = AppBlocObserver();
  runApp(MyApp());
}
```

### 4. Performance Issues

**Memory Leaks:**
```dart
// Dispose controllers
class ProductsPage extends StatefulWidget {
  @override
  _ProductsPageState createState() => _ProductsPageState();
}

class _ProductsPageState extends State<ProductsPage> {
  late ScrollController _scrollController;
  late TextEditingController _searchController;
  StreamSubscription? _subscription;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _searchController = TextEditingController();
    
    // Listen to stream
    _subscription = someStream.listen((data) {
      // Handle data
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    _subscription?.cancel();
    super.dispose();
  }
}
```

**Image Optimization:**
```dart
// Cached network images
CachedNetworkImage(
  imageUrl: product.imageUrl,
  placeholder: (context, url) => const CircularProgressIndicator(),
  errorWidget: (context, url, error) => const Icon(Icons.error),
  memCacheHeight: 200,
  memCacheWidth: 200,
  maxHeightDiskCache: 400,
  maxWidthDiskCache: 400,
)
```

## Base de Dados

### 1. Firestore Performance

**Query Optimization:**
```typescript
// Má prática - queries sem índices
const badQuery = db.collection('products')
  .where('categoryId', '==', 'electronics')
  .where('isActive', '==', true)
  .where('price', '>=', 100)
  .orderBy('name');

// Boa prática - queries otimizadas
const goodQuery = db.collection('products')
  .where('isActive', '==', true)
  .where('categoryId', '==', 'electronics')
  .orderBy('price')
  .startAt(100)
  .limit(20);

// Usar cursor pagination
const paginatedQuery = db.collection('products')
  .where('isActive', '==', true)
  .orderBy('createdAt', 'desc')
  .startAfter(lastDoc)
  .limit(20);
```

**Index Management:**
```bash
# Verificar índices necessários
firebase firestore:indexes --project your-project

# Deploy novos índices
firebase deploy --only firestore:indexes --project your-project

# Monitorizar performance
gcloud logging read 'protoPayload.methodName="google.firestore.v1.Firestore.RunQuery"' \
  --limit=50 --format=json
```

### 2. Connection Pool Issues

**PostgreSQL Optimization:**
```typescript
// Pool configuration
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
  
  // Pool settings
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Connection timeout
  acquireTimeoutMillis: 30000,   // Acquire timeout
  
  // Health check
  allowExitOnIdle: true
});

// Monitor pool
pool.on('connect', (client) => {
  console.log('New client connected');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('remove', (client) => {
  console.log('Client removed');
});

// Query with timeout
const queryWithTimeout = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    const result = await Promise.race([
      client.query(text, params),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 30000)
      )
    ]);
    return result;
  } finally {
    client.release();
  }
};
```

### 3. Data Integrity Issues

**Transaction Management:**
```typescript
// Firestore transactions
const transferStock = async (fromProductId: string, toProductId: string, quantity: number) => {
  const transaction = db.runTransaction(async (t) => {
    const fromProductRef = db.collection('products').doc(fromProductId);
    const toProductRef = db.collection('products').doc(toProductId);
    
    const fromProduct = await t.get(fromProductRef);
    const toProduct = await t.get(toProductRef);
    
    if (!fromProduct.exists || !toProduct.exists) {
      throw new Error('Product not found');
    }
    
    const fromStock = fromProduct.data()?.inventory.currentStock || 0;
    const toStock = toProduct.data()?.inventory.currentStock || 0;
    
    if (fromStock < quantity) {
      throw new Error('Insufficient stock');
    }
    
    t.update(fromProductRef, {
      'inventory.currentStock': fromStock - quantity,
      updatedAt: Timestamp.now()
    });
    
    t.update(toProductRef, {
      'inventory.currentStock': toStock + quantity,
      updatedAt: Timestamp.now()
    });
    
    // Log movimento
    const movementRef = db.collection('stockMovements').doc();
    t.set(movementRef, {
      fromProductId,
      toProductId,
      quantity,
      type: 'transfer',
      createdAt: Timestamp.now()
    });
  });
  
  return transaction;
};
```

## Performance

### 1. Slow API Responses

**Performance Profiling:**
```typescript
// Middleware para timing
const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    console.log(`${req.method} ${req.path}: ${duration.toFixed(2)}ms`);
    
    // Alert em requests lentos
    if (duration > 1000) {
      console.warn(`Slow request detected: ${req.path} took ${duration}ms`, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
    
    // Adicionar header de timing
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
  });
  
  next();
};

// Database query profiling
const profileQuery = async (queryName: string, queryFn: Function) => {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    console.log(`Query ${queryName}: ${duration}ms`);
    
    if (duration > 500) {
      console.warn(`Slow query: ${queryName} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    console.error(`Query ${queryName} failed:`, error);
    throw error;
  }
};
```

### 2. Memory Leaks

**Memory Monitoring:**
```typescript
// Monitor memory usage
const monitorMemory = () => {
  setInterval(() => {
    const usage = process.memoryUsage();
    const formatMemory = (bytes: number) => Math.round(bytes / 1024 / 1024);
    
    const memoryInfo = {
      rss: formatMemory(usage.rss),
      heapTotal: formatMemory(usage.heapTotal),
      heapUsed: formatMemory(usage.heapUsed),
      external: formatMemory(usage.external)
    };
    
    console.log('Memory usage (MB):', memoryInfo);
    
    // Alert se uso de memória muito alto
    if (memoryInfo.heapUsed > 500) {
      console.warn('High memory usage detected:', memoryInfo);
      
      // Trigger garbage collection se disponível
      if (global.gc) {
        console.log('Forcing garbage collection...');
        global.gc();
      }
    }
  }, 60000); // Check every minute
};

// Detect memory leaks
const detectMemoryLeaks = () => {
  let lastHeapUsed = 0;
  let increasingCount = 0;
  
  setInterval(() => {
    const currentHeapUsed = process.memoryUsage().heapUsed;
    
    if (currentHeapUsed > lastHeapUsed) {
      increasingCount++;
    } else {
      increasingCount = 0;
    }
    
    // Se memória continua crescendo por 10 checks consecutivos
    if (increasingCount >= 10) {
      console.error('Potential memory leak detected!', {
        currentHeap: Math.round(currentHeapUsed / 1024 / 1024) + 'MB',
        increasingCount
      });
    }
    
    lastHeapUsed = currentHeapUsed;
  }, 30000); // Check every 30 seconds
};
```

### 3. Database Performance

**Query Optimization:**
```typescript
// Cache frequently accessed data
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

const getCachedData = async (key: string, fetchFn: Function) => {
  let data = cache.get(key);
  
  if (!data) {
    data = await fetchFn();
    cache.set(key, data);
  }
  
  return data;
};

// Batch operations
const batchUpdateProducts = async (updates: Array<{id: string, data: any}>) => {
  const batch = db.batch();
  
  updates.forEach(({ id, data }) => {
    const ref = db.collection('products').doc(id);
    batch.update(ref, data);
  });
  
  return batch.commit();
};

// Pagination optimization
const getPaginatedProducts = async (pageSize = 20, lastDoc?: any) => {
  let query = db.collection('products')
    .where('isActive', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(pageSize);
    
  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }
  
  const snapshot = await query.get();
  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  return {
    products,
    lastDoc: snapshot.docs[snapshot.docs.length - 1],
    hasMore: snapshot.docs.length === pageSize
  };
};
```

## Ferramentas de Debug

### 1. Logging Estruturado

**Winston Configuration:**
```typescript
// logger.ts
import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

const loggingWinston = new LoggingWinston({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
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
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        service: process.env.SERVICE_NAME || 'stock-management',
        version: process.env.APP_VERSION || '1.0.0',
        ...meta
      });
    })
  ),
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

// Structured logging helpers
export const logError = (message: string, error: Error, context?: any) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context
  });
};

export const logPerformance = (operation: string, duration: number, context?: any) => {
  logger.info(`Performance: ${operation}`, {
    performance: {
      operation,
      duration,
      slow: duration > 1000
    },
    context
  });
};
```

### 2. Health Checks

**Comprehensive Health Check:**
```typescript
// healthcheck.ts
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  checks: {
    [key: string]: 'ok' | 'error' | 'warning';
  };
  details?: {
    [key: string]: any;
  };
}

export const healthCheck = async (req: Request, res: Response) => {
  const start = Date.now();
  const health: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {},
    details: {}
  };

  // Database connectivity
  try {
    const db = getFirestore();
    const testRef = db.collection('health').doc('test');
    
    const dbStart = Date.now();
    await testRef.get();
    const dbLatency = Date.now() - dbStart;
    
    health.checks.database = dbLatency < 1000 ? 'ok' : 'warning';
    health.details.database = { latency: `${dbLatency}ms` };
  } catch (error) {
    health.checks.database = 'error';
    health.details.database = { error: error.message };
    health.status = 'unhealthy';
  }

  // External services
  try {
    const response = await fetch('https://firestore.googleapis.com/', {
      method: 'HEAD',
      timeout: 5000
    });
    health.checks.firestore_api = response.ok ? 'ok' : 'error';
  } catch (error) {
    health.checks.firestore_api = 'error';
    health.details.firestore_api = { error: error.message };
  }

  // Memory check
  const memoryUsageMB = Math.round(health.memory.heapUsed / 1024 / 1024);
  if (memoryUsageMB > 400) {
    health.checks.memory = 'warning';
    health.status = health.status === 'healthy' ? 'degraded' : health.status;
  } else {
    health.checks.memory = 'ok';
  }

  // Response time
  const responseTime = Date.now() - start;
  health.details.responseTime = `${responseTime}ms`;

  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;
                     
  res.status(statusCode).json(health);
};

// Readiness check (for Kubernetes)
export const readinessCheck = async (req: Request, res: Response) => {
  try {
    // Check if app is ready to receive traffic
    const db = getFirestore();
    await db.collection('health').doc('test').get();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
```

### 3. Debug Endpoints

**Development Debug Routes:**
```typescript
// debug.ts (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  
  // Memory info
  app.get('/debug/memory', (req, res) => {
    const usage = process.memoryUsage();
    res.json({
      memory: {
        rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(usage.external / 1024 / 1024) + ' MB'
      },
      uptime: process.uptime(),
      pid: process.pid,
      platform: process.platform,
      version: process.version
    });
  });

  // Force garbage collection
  app.post('/debug/gc', (req, res) => {
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      
      res.json({
        message: 'Garbage collection forced',
        freed: Math.round((before - after) / 1024 / 1024) + ' MB'
      });
    } else {
      res.status(400).json({
        error: 'Garbage collection not exposed. Start with --expose-gc'
      });
    }
  });

  // Environment info
  app.get('/debug/env', (req, res) => {
    const safeEnv = { ...process.env };
    
    // Remove sensitive data
    const sensitiveKeys = ['JWT_SECRET', 'FIREBASE_PRIVATE_KEY', 'PASSWORD'];
    sensitiveKeys.forEach(key => {
      if (safeEnv[key]) {
        safeEnv[key] = '[REDACTED]';
      }
    });
    
    res.json({
      environment: safeEnv,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    });
  });
}
```

## Logs e Monitorização

### 1. Consulta de Logs

**GCP Logging Queries:**
```bash
# Logs de erro
gcloud logging read 'severity>=ERROR' --limit=100 --format=json

# Logs de um serviço específico
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="products-service"' --limit=50

# Logs com filtro de tempo
gcloud logging read 'timestamp>="2024-01-15T00:00:00Z" AND timestamp<="2024-01-15T23:59:59Z"' --limit=100

# Logs de performance
gcloud logging read 'jsonPayload.performance.slow=true' --limit=50

# Logs de segurança
gcloud logging read 'jsonPayload.security.alert=true' --limit=20
```

**Log Analysis Scripts:**
```bash
#!/bin/bash
# scripts/analyze-logs.sh

# Error analysis
echo "=== ERROR ANALYSIS ==="
gcloud logging read 'severity>=ERROR' --limit=100 --format='value(timestamp,jsonPayload.message,jsonPayload.error)' | head -20

# Performance analysis
echo "=== SLOW REQUESTS ==="
gcloud logging read 'jsonPayload.performance.duration>1000' --limit=50 --format='value(timestamp,jsonPayload.performance)'

# Security alerts
echo "=== SECURITY ALERTS ==="
gcloud logging read 'jsonPayload.security OR jsonPayload.auth' --limit=20

# Top errors
echo "=== TOP ERROR MESSAGES ==="
gcloud logging read 'severity>=ERROR' --limit=1000 --format='value(jsonPayload.error.message)' | sort | uniq -c | sort -nr | head -10
```

### 2. Monitoring Setup

**Prometheus Metrics:**
```typescript
// metrics.ts
import promClient from 'prom-client';

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['collection', 'operation'],
  buckets: [0.01, 0.1, 0.5, 1, 2]
});

// Middleware
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
      
    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
};

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

### 3. Alerting

**Alert Configuration:**
```yaml
# alerting/rules.yml
groups:
- name: stock-management
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} requests per second"

  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }} seconds"

  - alert: ServiceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service is down"
      description: "{{ $labels.job }} has been down for more than 1 minute"
```

**Notification Script:**
```bash
#!/bin/bash
# scripts/notify-alert.sh

WEBHOOK_URL="${SLACK_WEBHOOK_URL}"
ALERT_TYPE="$1"
MESSAGE="$2"

send_slack_alert() {
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 Stock Management Alert: $ALERT_TYPE\n$MESSAGE\"}" \
    "$WEBHOOK_URL"
}

send_email_alert() {
  echo "$MESSAGE" | mail -s "Stock Management Alert: $ALERT_TYPE" admin@yourdomain.com
}

# Send notifications
send_slack_alert
send_email_alert

echo "Alert sent: $ALERT_TYPE"
```

Este guia de troubleshooting fornece soluções para os problemas mais comuns e ferramentas para diagnosticar e resolver issues rapidamente no Sistema de Gestão de Stock.