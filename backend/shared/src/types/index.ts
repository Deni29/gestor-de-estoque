import { Timestamp } from '@google-cloud/firestore';

// Base interfaces
export interface BaseEntity {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User Types
export interface UserRole {
  id: string;
  name: 'admin' | 'manager' | 'operator';
  description: string;
  permissions: UserPermissions;
}

export interface UserPermissions {
  products: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  stock: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  suppliers: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  customers: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  reports: {
    read: boolean;
    export: boolean;
    admin: boolean;
  };
  users: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}

export interface User extends BaseEntity {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'operator';
  permissions: UserPermissions;
  profile: {
    phone?: string;
    department?: string;
    location?: string;
    avatar?: string;
  };
  settings: {
    language: 'pt' | 'en';
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      lowStock: boolean;
    };
  };
  lastLogin?: Timestamp;
  isActive: boolean;
}

// Category Types
export interface Category extends BaseEntity {
  name: string;
  description: string;
  parentId?: string;
  color: string;
  icon: string;
  isActive: boolean;
}

// Supplier Types
export interface Supplier extends BaseEntity {
  name: string;
  tradeName?: string;
  taxId: string;
  contact: {
    email: string;
    phone: string;
    website?: string;
    contactPerson: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentTerms?: string;
  creditLimit?: number;
  rating?: number;
  notes?: string;
  isActive: boolean;
}

// Product Types
export interface ProductPricing {
  costPrice: number;
  salePrice: number;
  currency: 'EUR' | 'USD';
  taxRate: number;
  markup: number;
}

export interface ProductInventory {
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  unit: 'un' | 'kg' | 'm' | 'l' | 'box' | 'pack';
  location: string;
}

export interface ProductSpecifications {
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  color?: string;
  size?: string;
  material?: string;
}

export interface ProductMedia {
  images: string[];
  primaryImage?: string;
  documents: string[];
}

export interface Product extends BaseEntity {
  sku: string;
  barcode?: string;
  name: string;
  description: string;
  brand?: string;
  model?: string;
  categoryId: string;
  supplierId: string;
  pricing: ProductPricing;
  inventory: ProductInventory;
  specifications: ProductSpecifications;
  media: ProductMedia;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
}

// Customer Types
export interface CustomerAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Customer extends BaseEntity {
  type: 'individual' | 'company';
  name: string;
  taxId?: string;
  email: string;
  phone: string;
  address: {
    billing: CustomerAddress;
    shipping?: CustomerAddress;
  };
  financials: {
    creditLimit: number;
    currentCredit: number;
    paymentTerms: string;
    defaultDiscount: number;
  };
  preferences: {
    preferredContact: 'email' | 'phone' | 'sms';
    language: 'pt' | 'en';
  };
  stats: {
    totalOrders: number;
    totalValue: number;
    averageOrderValue: number;
    lastOrderDate?: Timestamp;
  };
  isActive: boolean;
}

// Stock Movement Types
export interface StockMovementQuantity {
  amount: number;
  unit: string;
}

export interface StockMovementReference {
  documentType: 'invoice' | 'order' | 'adjustment';
  documentNumber: string;
  documentDate: Timestamp;
}

export interface StockMovementLocation {
  from?: string;
  to?: string;
}

export interface StockMovementPricing {
  unitCost: number;
  totalCost: number;
  currency: string;
}

export interface StockMovementBatch {
  batchNumber?: string;
  expirationDate?: Timestamp;
  manufacturingDate?: Timestamp;
}

export interface StockMovement extends BaseEntity {
  productId: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  reason: 'purchase' | 'sale' | 'return' | 'loss' | 'found' | 'adjustment';
  quantity: StockMovementQuantity;
  reference?: StockMovementReference;
  location: StockMovementLocation;
  pricing: StockMovementPricing;
  batch?: StockMovementBatch;
  notes?: string;
  stockBefore: number;
  stockAfter: number;
  approvedBy?: string;
  approvedAt?: Timestamp;
}

// Stock Alert Types
export interface StockAlert extends BaseEntity {
  productId: string;
  type: 'low_stock' | 'out_of_stock' | 'overstock';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'ignored';
  thresholds: {
    current: number;
    minimum: number;
    maximum: number;
  };
  message: string;
  assignedTo?: string;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  notifications: {
    emailSent: boolean;
    pushSent: boolean;
    sentAt?: Timestamp;
  };
}

// Audit Log Types
export interface AuditLogChanges {
  before?: any;
  after?: any;
}

export interface AuditLogMetadata {
  ip: string;
  userAgent: string;
  sessionId: string;
  location?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'view';
  resource: 'product' | 'stock' | 'user' | 'supplier' | 'customer' | 'category';
  resourceId: string;
  changes?: AuditLogChanges;
  metadata: AuditLogMetadata;
  timestamp: Timestamp;
}

// Dashboard Types
export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalSuppliers: number;
  totalCustomers: number;
  recentMovements: number;
  pendingAlerts: number;
}

export interface DashboardChart {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
  }[];
}

// Search and Filter Types
export interface ProductFilters {
  categoryId?: string;
  supplierId?: string;
  brand?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  tags?: string[];
}

export interface StockMovementFilters {
  productId?: string;
  type?: string;
  reason?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
}

// API Request Types
export interface CreateProductRequest {
  sku: string;
  barcode?: string;
  name: string;
  description: string;
  brand?: string;
  model?: string;
  categoryId: string;
  supplierId: string;
  pricing: ProductPricing;
  inventory: Omit<ProductInventory, 'currentStock'>;
  specifications?: ProductSpecifications;
  tags?: string[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

export interface CreateStockMovementRequest {
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  reason: string;
  quantity: StockMovementQuantity;
  reference?: StockMovementReference;
  location: StockMovementLocation;
  pricing: StockMovementPricing;
  batch?: StockMovementBatch;
  notes?: string;
}

// Export all types
export * from './errors';
export * from './auth';