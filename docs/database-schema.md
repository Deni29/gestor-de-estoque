# Esquema da Base de Dados - Sistema de Gestão de Stock

## Firestore Collections

### 1. Users Collection
```javascript
// Collection: users/{userId}
{
  uid: string,                    // Firebase Auth UID
  email: string,                  // Email do utilizador
  displayName: string,            // Nome completo
  role: string,                   // "admin", "manager", "operator"
  permissions: {                  // Permissões específicas
    products: {
      create: boolean,
      read: boolean,
      update: boolean,
      delete: boolean
    },
    stock: {
      create: boolean,
      read: boolean,
      update: boolean,
      delete: boolean
    },
    reports: {
      read: boolean,
      export: boolean
    }
  },
  profile: {
    phone: string,
    department: string,
    location: string,
    avatar: string                // URL da imagem
  },
  settings: {
    language: string,             // "pt", "en"
    theme: string,                // "light", "dark"
    notifications: {
      email: boolean,
      push: boolean,
      lowStock: boolean
    }
  },
  lastLogin: timestamp,
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. Categories Collection
```javascript
// Collection: categories/{categoryId}
{
  id: string,
  name: string,                   // Nome da categoria
  description: string,            // Descrição
  parentId: string,               // Para categorias hierárquicas
  color: string,                  // Cor para UI (#hexcode)
  icon: string,                   // Ícone Material Design
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string               // User ID
}
```

### 3. Suppliers Collection
```javascript
// Collection: suppliers/{supplierId}
{
  id: string,
  name: string,                   // Nome do fornecedor
  tradeName: string,              // Nome comercial
  taxId: string,                  // NIF/CNPJ
  contact: {
    email: string,
    phone: string,
    website: string,
    contactPerson: string
  },
  address: {
    street: string,
    city: string,
    state: string,
    zipCode: string,
    country: string
  },
  paymentTerms: string,           // Condições de pagamento
  creditLimit: number,
  rating: number,                 // 1-5 estrelas
  notes: string,
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

### 4. Products Collection
```javascript
// Collection: products/{productId}
{
  id: string,
  sku: string,                    // Código único do produto
  barcode: string,                // Código de barras
  name: string,                   // Nome do produto
  description: string,            // Descrição detalhada
  brand: string,                  // Marca
  model: string,                  // Modelo
  categoryId: string,             // Referência para categoria
  supplierId: string,             // Fornecedor principal
  
  pricing: {
    costPrice: number,            // Preço de custo
    salePrice: number,            // Preço de venda
    currency: string,             // "EUR", "USD"
    taxRate: number,              // Taxa de IVA (%)
    markup: number                // Margem de lucro (%)
  },
  
  inventory: {
    currentStock: number,         // Stock atual
    minStock: number,             // Stock mínimo
    maxStock: number,             // Stock máximo
    reorderPoint: number,         // Ponto de reposição
    unit: string,                 // "un", "kg", "m", "l"
    location: string              // Localização no armazém
  },
  
  specifications: {
    weight: number,               // Peso em kg
    dimensions: {
      length: number,             // cm
      width: number,              // cm
      height: number              // cm
    },
    color: string,
    size: string,
    material: string
  },
  
  media: {
    images: [string],             // URLs das imagens
    primaryImage: string,         // URL da imagem principal
    documents: [string]           // URLs de documentos
  },
  
  tags: [string],                 // Tags para pesquisa
  isActive: boolean,
  isFeatured: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

### 5. Customers Collection
```javascript
// Collection: customers/{customerId}
{
  id: string,
  type: string,                   // "individual", "company"
  name: string,                   // Nome/Razão social
  taxId: string,                  // NIF/CNPJ
  email: string,
  phone: string,
  
  address: {
    billing: {
      street: string,
      city: string,
      state: string,
      zipCode: string,
      country: string
    },
    shipping: {
      street: string,
      city: string,
      state: string,
      zipCode: string,
      country: string
    }
  },
  
  financials: {
    creditLimit: number,
    currentCredit: number,
    paymentTerms: string,
    defaultDiscount: number
  },
  
  preferences: {
    preferredContact: string,     // "email", "phone", "sms"
    language: string
  },
  
  stats: {
    totalOrders: number,
    totalValue: number,
    averageOrderValue: number,
    lastOrderDate: timestamp
  },
  
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

### 6. Stock Movements Collection
```javascript
// Collection: stockMovements/{movementId}
{
  id: string,
  productId: string,              // Referência para produto
  type: string,                   // "in", "out", "adjustment", "transfer"
  reason: string,                 // "purchase", "sale", "return", "loss", "found"
  
  quantity: {
    amount: number,               // Quantidade (positiva ou negativa)
    unit: string                  // Unidade de medida
  },
  
  reference: {
    documentType: string,         // "invoice", "order", "adjustment"
    documentNumber: string,       // Número do documento
    documentDate: timestamp
  },
  
  location: {
    from: string,                 // Localização origem
    to: string                    // Localização destino
  },
  
  pricing: {
    unitCost: number,             // Custo unitário
    totalCost: number,            // Custo total
    currency: string
  },
  
  batch: {
    batchNumber: string,          // Lote
    expirationDate: timestamp,    // Data de validade
    manufacturingDate: timestamp  // Data de fabrico
  },
  
  notes: string,                  // Observações
  stockBefore: number,            // Stock antes do movimento
  stockAfter: number,             // Stock após o movimento
  
  createdAt: timestamp,
  createdBy: string,              // Utilizador que criou
  approvedBy: string,             // Utilizador que aprovou
  approvedAt: timestamp
}
```

### 7. Stock Alerts Collection
```javascript
// Collection: stockAlerts/{alertId}
{
  id: string,
  productId: string,
  type: string,                   // "low_stock", "out_of_stock", "overstock"
  priority: string,               // "low", "medium", "high", "critical"
  status: string,                 // "active", "resolved", "ignored"
  
  thresholds: {
    current: number,
    minimum: number,
    maximum: number
  },
  
  message: string,                // Mensagem do alerta
  
  assignedTo: string,             // User ID responsável
  resolvedBy: string,             // User ID que resolveu
  resolvedAt: timestamp,
  
  notifications: {
    emailSent: boolean,
    pushSent: boolean,
    sentAt: timestamp
  },
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 8. Audit Logs Collection
```javascript
// Collection: auditLogs/{logId}
{
  id: string,
  userId: string,                 // Quem fez a ação
  action: string,                 // "create", "update", "delete", "view"
  resource: string,               // "product", "stock", "user", etc.
  resourceId: string,             // ID do recurso afetado
  
  changes: {
    before: object,               // Estado anterior
    after: object                 // Estado atual
  },
  
  metadata: {
    ip: string,                   // IP do utilizador
    userAgent: string,            // Browser/App info
    sessionId: string,
    location: string              // Geolocalização aproximada
  },
  
  timestamp: timestamp
}
```

## Índices Firestore Recomendados

### Índices Compostos
```javascript
// Products
products: [
  { fields: ["categoryId", "isActive", "updatedAt"] },
  { fields: ["supplierId", "isActive", "name"] },
  { fields: ["inventory.currentStock", "inventory.minStock"] },
  { fields: ["tags", "isActive", "name"] }
]

// Stock Movements
stockMovements: [
  { fields: ["productId", "createdAt"] },
  { fields: ["type", "createdAt"] },
  { fields: ["createdBy", "createdAt"] },
  { fields: ["productId", "type", "createdAt"] }
]

// Stock Alerts
stockAlerts: [
  { fields: ["status", "priority", "createdAt"] },
  { fields: ["assignedTo", "status", "createdAt"] },
  { fields: ["type", "status", "createdAt"] }
]

// Audit Logs
auditLogs: [
  { fields: ["userId", "timestamp"] },
  { fields: ["resource", "timestamp"] },
  { fields: ["action", "timestamp"] }
]
```

## Regras de Segurança Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users podem ler/editar apenas seus próprios dados
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
                     resource.data.role in ['admin', 'manager'];
    }
    
    // Products - baseado em permissões
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      hasPermission('products', 'write');
    }
    
    // Stock Movements - apenas utilizadores autorizados
    match /stockMovements/{movementId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                       hasPermission('stock', 'write');
      allow update: if request.auth != null && 
                       (resource.data.createdBy == request.auth.uid ||
                        hasPermission('stock', 'admin'));
    }
    
    function hasPermission(resource, action) {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid))
             .data.permissions[resource][action] == true;
    }
  }
}
```