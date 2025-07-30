# Security Guide

This document outlines security best practices and implementation guidelines for the Stock Management System.

## 🔐 Authentication & Authorization

### Firebase Authentication

The system uses Firebase Authentication for user management with the following configuration:

#### Supported Authentication Methods

1. **Email/Password Authentication**
2. **Google OAuth**
3. **Multi-Factor Authentication (MFA)**

#### Implementation

```typescript
// Initialize Firebase Auth
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  // Your config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Connect to emulator in development
if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

### Role-Based Access Control (RBAC)

#### User Roles

1. **Super Admin** - Full system access
2. **Admin** - Organization management
3. **Manager** - Department management
4. **Staff** - Limited operational access
5. **Viewer** - Read-only access

#### Custom Claims Implementation

```typescript
// Backend: Set custom claims
async function setUserRole(uid: string, role: string) {
  const customClaims = { role };
  await admin.auth().setCustomUserClaims(uid, customClaims);
}

// Frontend: Check user permissions
function hasPermission(user: User, resource: string, action: string): boolean {
  const token = user.getIdTokenResult();
  const role = token.claims.role;
  
  return PERMISSIONS[role]?.[resource]?.includes(action);
}
```

### JWT Token Security

#### Token Configuration

```typescript
// Token validation middleware
const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

## 🛡️ API Security

### Input Validation & Sanitization

#### Request Validation

```typescript
import Joi from 'joi';

const productSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  sku: Joi.string().trim().pattern(/^[A-Z0-9-]+$/).required(),
  price: Joi.number().positive().precision(2).required(),
  description: Joi.string().trim().max(1000).optional(),
});

// Validation middleware
const validateProduct = (req: Request, res: Response, next: NextFunction) => {
  const { error } = productSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }
  next();
};
```

#### Data Sanitization

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize HTML content
function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

// SQL injection prevention
import { query } from './database';

async function getProduct(id: string) {
  // Use parameterized queries
  const result = await query(
    'SELECT * FROM products WHERE id = $1',
    [id]
  );
  return result.rows[0];
}
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit auth attempts
  skipSuccessfulRequests: true,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

### CORS Configuration

```typescript
import cors from 'cors';

const corsOptions = {
  origin: function (origin: string, callback: Function) {
    const allowedOrigins = [
      'https://stockmanagement.com',
      'https://app.stockmanagement.com',
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

## 🔒 Data Protection

### Encryption at Rest

#### Database Encryption

```typescript
// Sensitive data encryption
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes key
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  cipher.setAAD(Buffer.from('stock-management'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  decipher.setAAD(Buffer.from('stock-management'));
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Personal Data Protection

#### GDPR Compliance

```typescript
// Data retention policy
interface DataRetentionPolicy {
  userProfiles: number; // 7 years
  auditLogs: number;    // 5 years
  sessionData: number;  // 30 days
}

const RETENTION_PERIODS: DataRetentionPolicy = {
  userProfiles: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years in ms
  auditLogs: 5 * 365 * 24 * 60 * 60 * 1000,    // 5 years in ms
  sessionData: 30 * 24 * 60 * 60 * 1000,       // 30 days in ms
};

// Automated data cleanup
async function cleanupExpiredData() {
  const now = Date.now();
  
  // Clean up session data
  await query(
    'DELETE FROM sessions WHERE created_at < $1',
    [new Date(now - RETENTION_PERIODS.sessionData)]
  );
  
  // Archive old audit logs
  await query(
    'UPDATE audit_logs SET archived = true WHERE created_at < $1 AND archived = false',
    [new Date(now - RETENTION_PERIODS.auditLogs)]
  );
}
```

## 🚨 Security Headers

### HTTP Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stockmanagement.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "same-origin" }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

## 📝 Audit Logging

### Comprehensive Audit Trail

```typescript
interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  sessionId?: string;
}

// Audit logging middleware
const auditLogger = (action: string, resource: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after successful response
      if (res.statusCode < 400) {
        logAuditEvent({
          userId: req.user?.uid,
          action,
          resource,
          resourceId: req.params.id,
          changes: req.body,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date(),
          sessionId: req.sessionID,
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Usage
app.post('/api/products', auditLogger('CREATE', 'product'), createProduct);
app.put('/api/products/:id', auditLogger('UPDATE', 'product'), updateProduct);
app.delete('/api/products/:id', auditLogger('DELETE', 'product'), deleteProduct);
```

## 🔍 Security Monitoring

### Intrusion Detection

```typescript
// Suspicious activity detection
interface SuspiciousActivityRule {
  name: string;
  condition: (events: AuditLogEntry[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: string;
}

const suspiciousActivityRules: SuspiciousActivityRule[] = [
  {
    name: 'Multiple failed login attempts',
    condition: (events) => {
      const failedLogins = events.filter(e => 
        e.action === 'LOGIN_FAILED' && 
        Date.now() - e.timestamp.getTime() < 5 * 60 * 1000 // 5 minutes
      );
      return failedLogins.length >= 5;
    },
    severity: 'high',
    action: 'LOCK_ACCOUNT'
  },
  {
    name: 'Mass data export',
    condition: (events) => {
      const exports = events.filter(e => 
        e.action === 'EXPORT' && 
        Date.now() - e.timestamp.getTime() < 60 * 60 * 1000 // 1 hour
      );
      return exports.length >= 10;
    },
    severity: 'medium',
    action: 'ALERT_ADMIN'
  }
];

// Real-time monitoring
async function checkSuspiciousActivity(userId: string) {
  const recentEvents = await getRecentAuditEvents(userId, '1 hour');
  
  for (const rule of suspiciousActivityRules) {
    if (rule.condition(recentEvents)) {
      await handleSuspiciousActivity(userId, rule);
    }
  }
}
```

## 🔐 Environment Security

### Environment Variables

```bash
# Production environment template
NODE_ENV=production

# Secrets (use secret management service)
JWT_SECRET=<strong-random-secret>
ENCRYPTION_KEY=<32-byte-hex-key>
DATABASE_PASSWORD=<complex-password>

# Firebase configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com

# External service keys
SENDGRID_API_KEY=<api-key>
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>

# Security settings
BCRYPT_ROUNDS=12
SESSION_SECRET=<session-secret>
COOKIE_SECURE=true
COOKIE_HTTP_ONLY=true
```

### Secret Management

```typescript
// AWS Secrets Manager integration
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-west-2" });

async function getSecret(secretName: string): Promise<string> {
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );
    return response.SecretString || '';
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw new Error('Failed to retrieve secret');
  }
}

// Usage
const dbPassword = await getSecret('stock-management/db-password');
```

## 📋 Security Checklist

### Development Security

- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection implemented
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Authentication required for all sensitive operations
- [ ] Authorization checks implemented
- [ ] Audit logging in place
- [ ] Error handling doesn't leak sensitive information
- [ ] Dependencies regularly updated

### Infrastructure Security

- [ ] HTTPS/TLS configured
- [ ] Security headers implemented
- [ ] Firewall rules configured
- [ ] Database access restricted
- [ ] Environment variables secured
- [ ] Secrets management implemented
- [ ] Regular security updates
- [ ] Monitoring and alerting configured
- [ ] Backup encryption enabled
- [ ] Access logs enabled

### Deployment Security

- [ ] Production builds don't include debug information
- [ ] Source maps not exposed in production
- [ ] Default credentials changed
- [ ] Unnecessary services disabled
- [ ] Security scanning performed
- [ ] Penetration testing completed
- [ ] SSL certificate configured
- [ ] DNS security configured

## 🚨 Incident Response

### Security Incident Procedure

1. **Detection** - Monitor for security events
2. **Assessment** - Determine severity and impact
3. **Containment** - Limit damage and exposure
4. **Investigation** - Analyze the incident
5. **Recovery** - Restore normal operations
6. **Lessons Learned** - Update security measures

### Emergency Contacts

- **Security Team**: security@stockmanagement.com
- **On-call Engineer**: +1-555-SECURITY
- **Legal Team**: legal@stockmanagement.com

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)