# Guia de Segurança - Sistema de Gestão de Stock

## Índice
1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Autorização](#autorização)
4. [Proteção de Dados](#proteção-de-dados)
5. [Segurança de API](#segurança-de-api)
6. [Monitorização](#monitorização)
7. [Checklist](#checklist)

## Visão Geral

### Arquitetura de Segurança
```
┌─────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                     │
├─────────────────────────────────────────────────────────┤
│  WAF & CDN  │  Load Balancer  │  Rate Limiting        │
│ (Cloudflare)│   (GCP LB)      │   (API Gateway)       │
├─────────────────────────────────────────────────────────┤
│ Application │  Network        │  Data Encryption      │
│ Security    │  Security       │  (TLS/AES)           │
├─────────────────────────────────────────────────────────┤
│ Identity &  │  Audit &        │  Backup &            │
│ Access Mgmt │  Monitoring     │  Recovery            │
└─────────────────────────────────────────────────────────┘
```

### Princípios de Segurança
- **Defense in Depth**: Múltiplas camadas de proteção
- **Least Privilege**: Acesso mínimo necessário
- **Zero Trust**: Verificar sempre, nunca confiar
- **Privacy by Design**: Proteção desde o início

## Autenticação

### Firebase Authentication

#### Configuração Segura
```typescript
// firebase-admin.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const firebaseConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Token verification with security checks
export const verifyToken = async (idToken: string) => {
  try {
    const decodedToken = await auth.verifyIdToken(idToken, true);
    
    // Verificações adicionais de segurança
    const now = Math.floor(Date.now() / 1000);
    
    if (decodedToken.exp < now) {
      throw new Error('Token expired');
    }
    
    if (decodedToken.iat > now + 300) { // 5 min clock skew
      throw new Error('Token issued in future');
    }
    
    return decodedToken;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};
```

#### Middleware de Autenticação
```typescript
// middleware/auth.ts
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      });
    }

    const decodedToken = await verifyToken(token);
    const user = await getUserById(decodedToken.uid);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'User account disabled',
        code: 'ACCOUNT_DISABLED'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(401).json({ 
      error: 'Invalid token',
      code: 'AUTH_TOKEN_INVALID' 
    });
  }
};
```

#### Autenticação Multifator (2FA)
```typescript
// services/TwoFactorAuth.ts
export class TwoFactorAuthService {
  async setup2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    const secret = speakeasy.generateSecret({
      name: 'Stock Management',
      account: userId,
      length: 32
    });
    
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    // Store secret temporarily
    await redis.setex(`2fa_setup:${userId}`, 300, secret.base32);
    
    return {
      secret: secret.base32,
      qrCode
    };
  }
  
  async verify2FA(userId: string, token: string): Promise<boolean> {
    const user = await getUserById(userId);
    
    if (!user.twoFactorSecret) {
      throw new Error('2FA not enabled');
    }
    
    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });
  }
  
  async require2FA(req: AuthRequest, res: Response, next: NextFunction) {
    const user = req.user;
    
    if (!user.twoFactorEnabled) {
      return res.status(403).json({
        error: '2FA required for this operation',
        code: 'MFA_REQUIRED'
      });
    }
    
    next();
  }
}
```

### Políticas de Password

#### Validação Robusta
```typescript
// utils/passwordPolicy.ts
export const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfo: true,
  maxAge: 90 * 24 * 60 * 60 * 1000 // 90 dias
};

export const validatePassword = (password: string, userInfo?: any) => {
  const errors: string[] = [];
  
  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters`);
  }
  
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }
  
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }
  
  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain numbers');
  }
  
  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain special characters');
  }
  
  if (passwordPolicy.preventCommonPasswords && isCommonPassword(password)) {
    errors.push('Password is too common');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

const commonPasswords = new Set([
  'password', '123456', 'password123', 'admin', 'qwerty'
]);

const calculatePasswordStrength = (password: string): number => {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  return Math.min(score / 6 * 100, 100);
};
```

## Autorização

### Role-Based Access Control (RBAC)

#### Sistema de Permissões
```typescript
// types/auth.ts
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export const ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  admin: {
    products: { create: true, read: true, update: true, delete: true },
    stock: { create: true, read: true, update: true, delete: true },
    suppliers: { create: true, read: true, update: true, delete: true },
    customers: { create: true, read: true, update: true, delete: true },
    reports: { read: true, export: true, admin: true },
    users: { create: true, read: true, update: true, delete: true }
  },
  manager: {
    products: { create: true, read: true, update: true, delete: false },
    stock: { create: true, read: true, update: true, delete: false },
    suppliers: { create: true, read: true, update: true, delete: false },
    customers: { create: true, read: true, update: true, delete: false },
    reports: { read: true, export: true, admin: false },
    users: { create: false, read: true, update: false, delete: false }
  },
  operator: {
    products: { create: false, read: true, update: false, delete: false },
    stock: { create: true, read: true, update: false, delete: false },
    suppliers: { create: false, read: true, update: false, delete: false },
    customers: { create: false, read: true, update: false, delete: false },
    reports: { read: true, export: false, admin: false },
    users: { create: false, read: false, update: false, delete: false }
  }
};
```

#### Middleware de Autorização
```typescript
// middleware/authorization.ts
export const authorize = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const hasPermission = checkPermission(
      req.user.role,
      resource,
      action,
      { userId: req.user.uid, ...req.body }
    );
    
    if (!hasPermission) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.uid,
        role: req.user.role,
        resource,
        action,
        ip: req.ip
      });
      
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
  };
};

export const checkPermission = (
  userRole: string, 
  resource: string, 
  action: string,
  context?: any
): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) return false;
  
  return resourcePermissions[action] === true;
};
```

## Proteção de Dados

### Encriptação

#### Dados em Trânsito
```typescript
// config/ssl.ts
import https from 'https';
import fs from 'fs';

export const tlsOptions = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  secureProtocol: 'TLSv1_2_method',
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384'
  ].join(':'),
  honorCipherOrder: true
};
```

#### Dados em Repouso
```typescript
// utils/encryption.ts
import crypto from 'crypto';

export class DataEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  
  constructor(private encryptionKey: string) {
    if (Buffer.from(encryptionKey, 'hex').length !== this.keyLength) {
      throw new Error('Invalid encryption key length');
    }
  }
  
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, Buffer.from(this.encryptionKey, 'hex'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return iv.toString('hex') + encrypted + tag.toString('hex');
  }
  
  decrypt(ciphertext: string): string {
    const iv = Buffer.from(ciphertext.slice(0, this.ivLength * 2), 'hex');
    const tag = Buffer.from(ciphertext.slice(-16 * 2), 'hex');
    const encrypted = ciphertext.slice(this.ivLength * 2, -16 * 2);
    
    const decipher = crypto.createDecipher(this.algorithm, Buffer.from(this.encryptionKey, 'hex'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage para campos sensíveis
const encryption = new DataEncryption(process.env.FIELD_ENCRYPTION_KEY);

export const encryptSensitiveData = (data: any) => {
  const sensitiveFields = ['taxId', 'phone', 'email', 'address'];
  const encrypted = { ...data };
  
  for (const field of sensitiveFields) {
    if (encrypted[field]) {
      encrypted[field] = encryption.encrypt(encrypted[field]);
    }
  }
  
  return encrypted;
};
```

### Data Loss Prevention (DLP)

#### Detecção de Dados Sensíveis
```typescript
// services/DLPService.ts
export const dlpPatterns = {
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  ssn: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  phone: /\b\+?[\d\s\-\(\)]{10,}\b/,
  nif: /\b\d{9}\b/,
  iban: /\b[A-Z]{2}\d{2}[\s]?[\d]{4}[\s]?[\d]{4}[\s]?[\d]{4}[\s]?[\d]{4}[\s]?[\d]{0,2}\b/
};

export class DLPService {
  scanForSensitiveData(text: string): { type: string; matches: string[] }[] {
    const findings: { type: string; matches: string[] }[] = [];
    
    for (const [type, pattern] of Object.entries(dlpPatterns)) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        findings.push({ type, matches });
      }
    }
    
    return findings;
  }
  
  redactSensitiveData(text: string): string {
    let redacted = text;
    
    for (const [type, pattern] of Object.entries(dlpPatterns)) {
      redacted = redacted.replace(pattern, (match) => {
        return '*'.repeat(match.length);
      });
    }
    
    return redacted;
  }
}

// Middleware DLP
export const dlpMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const dlp = new DLPService();
  const textContent = JSON.stringify(req.body);
  const findings = dlp.scanForSensitiveData(textContent);
  
  if (findings.length > 0) {
    logger.warn('Sensitive data detected', {
      findings: findings.map(f => f.type),
      userId: req.user?.uid,
      endpoint: req.path
    });
    
    if (process.env.DLP_BLOCK_ENABLED === 'true') {
      return res.status(400).json({
        error: 'Request contains sensitive data',
        types: findings.map(f => f.type)
      });
    }
  }
  
  next();
};
```

## Segurança de API

### Rate Limiting Avançado

```typescript
// middleware/rateLimit.ts
import Redis from 'ioredis';

export class AdaptiveRateLimit {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async checkLimit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    const current = await this.redis.incr(redisKey);
    await this.redis.expire(redisKey, Math.ceil(windowMs / 1000));
    
    const allowed = current <= maxRequests;
    const remaining = Math.max(0, maxRequests - current);
    const resetTime = (window + 1) * windowMs;
    
    return { allowed, remaining, resetTime };
  }
}

// Rate limits por role
const rateLimits = {
  admin: { window: 60000, max: 1000 },
  manager: { window: 60000, max: 500 },
  operator: { window: 60000, max: 200 },
  anonymous: { window: 60000, max: 50 }
};

export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const rateLimiter = new AdaptiveRateLimit();
  const userRole = req.user?.role || 'anonymous';
  const userId = req.user?.uid || req.ip;
  
  const limit = rateLimits[userRole];
  const result = await rateLimiter.checkLimit(userId, limit.window, limit.max);
  
  res.set({
    'X-RateLimit-Limit': limit.max.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
  });
  
  if (!result.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    });
  }
  
  next();
};
```

### Validação e Sanitização

```typescript
// middleware/validation.ts
import Joi from 'joi';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export const schemas = {
  createProduct: Joi.object({
    sku: Joi.string().pattern(/^[A-Z0-9-]+$/).min(3).max(20).required(),
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(1000),
    pricing: Joi.object({
      costPrice: Joi.number().positive().precision(2).required(),
      salePrice: Joi.number().positive().precision(2).required()
    }).required()
  })
};

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    req.body = sanitizeObject(value);
    next();
  };
};

const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return purify.sanitize(obj, { ALLOWED_TAGS: [] });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
};
```

### Security Headers

```typescript
// middleware/securityHeaders.ts
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.yourdomain.com",
    "frame-ancestors 'none'"
  ].join('; '));
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (apenas em HTTPS)
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};
```

## Monitorização

### Audit Logging

```typescript
// services/AuditService.ts
interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: { before?: any; after?: any };
  metadata: {
    ip: string;
    userAgent: string;
    sessionId: string;
  };
  risk: 'low' | 'medium' | 'high' | 'critical';
}

export class AuditService {
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event
    };
    
    // Store in Firestore
    await db.collection('auditLogs').doc(auditEvent.id).set(auditEvent);
    
    // Real-time alerting para eventos críticos
    if (event.risk === 'high' || event.risk === 'critical') {
      await this.sendSecurityAlert(auditEvent);
    }
    
    logger.info('Audit event', auditEvent);
  }
  
  private async sendSecurityAlert(event: AuditEvent): Promise<void> {
    // Enviar alerta para equipa de segurança
    logger.warn('SECURITY ALERT', {
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      risk: event.risk,
      ip: event.metadata.ip
    });
  }
}

// Middleware de auditoria
export const auditMiddleware = (action: string, resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      if (res.statusCode < 400) {
        const auditService = new AuditService();
        
        await auditService.log({
          userId: req.user?.uid || 'anonymous',
          userRole: req.user?.role || 'unknown',
          action,
          resource,
          resourceId: req.params.id,
          metadata: {
            ip: req.ip,
            userAgent: req.get('User-Agent') || '',
            sessionId: req.sessionId || ''
          },
          risk: calculateRisk(action, resource, req.user?.role)
        });
      }
    });
    
    next();
  };
};
```

### Security Monitoring

```typescript
// services/SecurityMonitor.ts
export class SecurityMonitor {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async trackFailedLogins(email: string, ip: string): Promise<void> {
    const key = `failed_login:${ip}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 3600); // 1 hora
    
    if (count > 5) {
      logger.warn('Possible brute force attack', { email, ip, attempts: count });
      await this.blockIP(ip, 3600); // Bloquear por 1 hora
    }
  }
  
  async trackSuspiciousActivity(userId: string, activity: any): Promise<void> {
    const key = `user_activity:${userId}`;
    await this.redis.lpush(key, JSON.stringify({
      ...activity,
      timestamp: Date.now()
    }));
    
    await this.redis.ltrim(key, 0, 99); // Manter últimas 100
    
    const activities = await this.redis.lrange(key, 0, -1);
    
    // Detectar padrões suspeitos
    if (activities.length > 50) {
      logger.warn('High activity detected', { userId, count: activities.length });
    }
    
    // Verificar múltiplos IPs
    const ips = new Set(activities.map(a => JSON.parse(a).ip));
    if (ips.size > 3) {
      logger.warn('Multiple IP addresses detected', { userId, ips: Array.from(ips) });
    }
  }
  
  private async blockIP(ip: string, duration: number): Promise<void> {
    await this.redis.setex(`blocked_ip:${ip}`, duration, '1');
    logger.error('IP blocked', { ip, duration });
  }
  
  async isIPBlocked(ip: string): Promise<boolean> {
    const blocked = await this.redis.get(`blocked_ip:${ip}`);
    return blocked === '1';
  }
}
```

## Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users podem apenas aceder aos próprios dados
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                           request.auth.uid == userId;
      allow read: if request.auth != null && 
                     hasRole(['admin', 'manager']);
    }
    
    // Produtos - baseado em permissões
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      hasPermission('products', 'write');
    }
    
    // Stock movements
    match /stockMovements/{movementId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                       hasPermission('stock', 'write');
      allow update: if request.auth != null && 
                       (resource.data.createdBy == request.auth.uid ||
                        hasRole(['admin']));
    }
    
    // Audit logs - apenas leitura para admins
    match /auditLogs/{logId} {
      allow read: if request.auth != null && hasRole(['admin']);
      allow write: if false; // Apenas via backend
    }
    
    function hasRole(roles) {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid))
             .data.role in roles;
    }
    
    function hasPermission(resource, action) {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid))
             .data.permissions[resource][action] == true;
    }
  }
}
```

## Checklist

### Implementação ✅
- [ ] HTTPS configurado em todos os endpoints
- [ ] Autenticação Firebase implementada
- [ ] 2FA disponível para utilizadores privilegiados
- [ ] Autorização baseada em roles (RBAC)
- [ ] Validação robusta de input (Joi)
- [ ] Sanitização de dados de entrada
- [ ] Rate limiting adaptativo
- [ ] Security headers configurados
- [ ] Encriptação de dados sensíveis
- [ ] DLP (Data Loss Prevention) ativo
- [ ] Logs de auditoria completos
- [ ] Firestore security rules configuradas
- [ ] Monitorização de segurança ativa
- [ ] Detecção de anomalias

### Operacional ✅
- [ ] Backup automatizado e encriptado
- [ ] Alertas de segurança configurados
- [ ] Plano de resposta a incidentes
- [ ] Revisão regular de acessos
- [ ] Testes de penetração agendados
- [ ] Atualização regular de dependências
- [ ] Scan de vulnerabilidades automatizado
- [ ] Treinamento de segurança da equipa
- [ ] Conformidade GDPR implementada
- [ ] Documentação de segurança atualizada

### Monitorização Contínua ✅
- [ ] Logs centralizados (GCP Logging)
- [ ] Métricas de segurança (Prometheus)
- [ ] Dashboards de segurança (Grafana)
- [ ] Alertas automáticos (AlertManager)
- [ ] Análise de comportamento de utilizadores
- [ ] Detecção de intrusões
- [ ] Scanning de malware
- [ ] Avaliação contínua de riscos

Este guia de segurança fornece uma base sólida para proteger o Sistema de Gestão de Stock contra ameaças modernas, garantindo a confidencialidade, integridade e disponibilidade dos dados.