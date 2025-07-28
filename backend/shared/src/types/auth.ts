import { UserPermissions } from './index';

// JWT Token payload
export interface JWTPayload {
  uid: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
  permissions: UserPermissions;
  sessionId: string;
  iat: number;
  exp: number;
}

// Authentication request/response types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: {
      uid: string;
      email: string;
      displayName: string;
      role: string;
      permissions: UserPermissions;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  role?: 'manager' | 'operator';
  permissions?: Partial<UserPermissions>;
  profile?: {
    phone?: string;
    department?: string;
    location?: string;
  };
}

// Authorization types
export interface AuthContext {
  user: {
    uid: string;
    email: string;
    role: string;
    permissions: UserPermissions;
  };
  sessionId: string;
  isAuthenticated: boolean;
}

export interface PermissionCheck {
  resource: keyof UserPermissions;
  action: string;
  requireAll?: boolean;
}

// Session types
export interface UserSession {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

// Two-factor authentication
export interface TwoFactorSetupRequest {
  password: string;
}

export interface TwoFactorSetupResponse {
  success: boolean;
  data: {
    qrCode: string;
    secret: string;
    backupCodes: string[];
  };
}

export interface TwoFactorVerifyRequest {
  token: string;
  backupCode?: string;
}

export interface TwoFactorDisableRequest {
  password: string;
  token: string;
}

// Password policies
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // number of previous passwords
}

// Account lockout
export interface AccountLockout {
  maxAttempts: number;
  lockoutDuration: number; // minutes
  resetPeriod: number; // minutes
}

// Role definitions
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

// Authentication middleware types
export interface AuthRequest extends Request {
  user?: AuthContext['user'];
  sessionId?: string;
}

export type AuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => void;
export type PermissionMiddleware = (permissions: PermissionCheck[]) => AuthMiddleware;