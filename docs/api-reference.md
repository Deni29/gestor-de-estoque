# API Reference - Sistema de Gestão de Stock

## Índice
1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Produtos](#produtos)
4. [Stock](#stock)
5. [Fornecedores](#fornecedores)
6. [Clientes](#clientes)
7. [Relatórios](#relatórios)
8. [Utilizadores](#utilizadores)
9. [Categorias](#categorias)
10. [Códigos de Resposta](#códigos-de-resposta)
11. [Rate Limiting](#rate-limiting)
12. [Webhooks](#webhooks)

## Visão Geral

### Base URL
```
Produção: https://api.yourdomain.com
Desenvolvimento: http://localhost:8080
```

### Formato de Dados
- **Request/Response**: JSON
- **Encoding**: UTF-8
- **Date Format**: ISO 8601 (2024-01-15T10:30:00Z)
- **Currency**: EUR (formato decimal)

### Headers Padrão
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
Accept: application/json
X-API-Version: v1
```

### Estrutura de Resposta
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_12345"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Estrutura de Erro
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_12345"
  }
}
```

## Autenticação

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "uid": "user_12345",
      "email": "user@example.com",
      "name": "João Silva",
      "role": "manager",
      "permissions": {
        "products": { "create": true, "read": true, "update": true, "delete": false },
        "stock": { "create": true, "read": true, "update": true, "delete": false }
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "refresh_token_here",
      "expiresIn": 3600
    }
  }
}
```

### Refresh Token
```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

### Reset Password
```http
POST /auth/reset-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### Setup 2FA
```http
POST /auth/2fa/setup
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": [
      "12345678",
      "87654321"
    ]
  }
}
```

### Verify 2FA
```http
POST /auth/2fa/verify
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "code": "123456"
}
```

## Produtos

### Listar Produtos
```http
GET /api/products
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (integer): Número da página (default: 1)
- `limit` (integer): Items por página (default: 20, max: 100)
- `search` (string): Pesquisa por nome, SKU ou código de barras
- `categoryId` (string): Filtrar por categoria
- `supplierId` (string): Filtrar por fornecedor
- `isActive` (boolean): Filtrar por status ativo
- `lowStock` (boolean): Apenas produtos com stock baixo
- `sortBy` (string): Campo para ordenação (name, price, stock, createdAt)
- `sortOrder` (string): Direção da ordenação (asc, desc)

**Exemplo:**
```http
GET /api/products?page=1&limit=20&search=laptop&categoryId=cat_123&sortBy=name&sortOrder=asc
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prod_12345",
      "sku": "LAPTOP-001",
      "barcode": "1234567890123",
      "name": "Laptop Dell Inspiron 15",
      "description": "Laptop para uso profissional",
      "brand": "Dell",
      "model": "Inspiron 15 3000",
      "categoryId": "cat_123",
      "supplierId": "sup_456",
      "pricing": {
        "costPrice": 450.00,
        "salePrice": 699.99,
        "currency": "EUR",
        "taxRate": 23.0,
        "markup": 55.55
      },
      "inventory": {
        "currentStock": 25,
        "minStock": 5,
        "maxStock": 100,
        "reorderPoint": 10,
        "unit": "un",
        "location": "A1-B2"
      },
      "specifications": {
        "weight": 2.1,
        "dimensions": {
          "length": 35.8,
          "width": 24.7,
          "height": 1.9
        },
        "color": "Preto",
        "material": "Plástico"
      },
      "media": {
        "images": [
          "https://storage.googleapis.com/bucket/laptop1.jpg"
        ],
        "primaryImage": "https://storage.googleapis.com/bucket/laptop1.jpg"
      },
      "tags": ["laptop", "dell", "profissional"],
      "isActive": true,
      "isFeatured": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "createdBy": "user_123"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Obter Produto por ID
```http
GET /api/products/{productId}
Authorization: Bearer <token>
```

### Obter Produto por SKU
```http
GET /api/products/sku/{sku}
Authorization: Bearer <token>
```

### Obter Produto por Código de Barras
```http
GET /api/products/barcode/{barcode}
Authorization: Bearer <token>
```

### Criar Produto
```http
POST /api/products
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "sku": "LAPTOP-002",
  "barcode": "1234567890124",
  "name": "Laptop HP Pavilion",
  "description": "Laptop para uso doméstico",
  "brand": "HP",
  "model": "Pavilion 15",
  "categoryId": "cat_123",
  "supplierId": "sup_456",
  "pricing": {
    "costPrice": 400.00,
    "salePrice": 599.99,
    "currency": "EUR",
    "taxRate": 23.0
  },
  "inventory": {
    "currentStock": 15,
    "minStock": 3,
    "maxStock": 50,
    "reorderPoint": 8,
    "unit": "un",
    "location": "A1-B3"
  },
  "specifications": {
    "weight": 1.8,
    "dimensions": {
      "length": 35.0,
      "width": 24.0,
      "height": 1.8
    },
    "color": "Prata"
  },
  "tags": ["laptop", "hp", "doméstico"]
}
```

### Atualizar Produto
```http
PUT /api/products/{productId}
Authorization: Bearer <token>
```

### Atualização Parcial
```http
PATCH /api/products/{productId}
Authorization: Bearer <token>
```

**Request Body (exemplo):**
```json
{
  "pricing": {
    "salePrice": 649.99
  },
  "inventory": {
    "minStock": 5
  }
}
```

### Eliminar Produto
```http
DELETE /api/products/{productId}
Authorization: Bearer <token>
```

### Upload de Imagem
```http
POST /api/products/{productId}/images
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `image`: Ficheiro de imagem (JPG, PNG, max 5MB)
- `isPrimary`: boolean (opcional)

### Atualização em Lote
```http
PATCH /api/products/batch
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "updates": [
    {
      "id": "prod_123",
      "data": {
        "pricing": { "salePrice": 599.99 }
      }
    },
    {
      "id": "prod_456",
      "data": {
        "inventory": { "minStock": 10 }
      }
    }
  ]
}
```

## Stock

### Listar Movimentos de Stock
```http
GET /api/stock/movements
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`, `limit`: Paginação
- `productId` (string): Filtrar por produto
- `type` (string): Tipo de movimento (in, out, adjustment, transfer)
- `startDate` (string): Data inicial (ISO 8601)
- `endDate` (string): Data final (ISO 8601)
- `userId` (string): Filtrar por utilizador
- `reference` (string): Filtrar por referência

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mov_12345",
      "productId": "prod_12345",
      "type": "in",
      "quantity": 50,
      "previousStock": 25,
      "newStock": 75,
      "unitCost": 450.00,
      "totalCost": 22500.00,
      "reference": "PO-2024-001",
      "reason": "purchase",
      "notes": "Compra mensal de laptops",
      "supplierId": "sup_456",
      "customerId": null,
      "batchInfo": {
        "batchNumber": "BATCH-001",
        "expiryDate": "2025-12-31T23:59:59Z",
        "manufacturingDate": "2024-01-01T00:00:00Z"
      },
      "location": {
        "from": null,
        "to": "A1-B2"
      },
      "metadata": {
        "source": "manual",
        "deviceId": "tablet_001",
        "gpsLocation": {
          "latitude": 38.7223,
          "longitude": -9.1393
        }
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "createdBy": "user_123",
      "approvedAt": "2024-01-15T11:00:00Z",
      "approvedBy": "user_456"
    }
  ]
}
```

### Registar Entrada de Stock
```http
POST /api/stock/in
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "prod_12345",
  "quantity": 50,
  "unitCost": 450.00,
  "reference": "PO-2024-001",
  "reason": "purchase",
  "notes": "Compra mensal",
  "supplierId": "sup_456",
  "batchInfo": {
    "batchNumber": "BATCH-001",
    "expiryDate": "2025-12-31T23:59:59Z",
    "manufacturingDate": "2024-01-01T00:00:00Z"
  },
  "location": "A1-B2"
}
```

### Registar Saída de Stock
```http
POST /api/stock/out
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "prod_12345",
  "quantity": 10,
  "unitPrice": 699.99,
  "reference": "SO-2024-001",
  "reason": "sale",
  "notes": "Venda online",
  "customerId": "cust_789",
  "location": "A1-B2"
}
```

### Ajuste de Stock
```http
POST /api/stock/adjustment
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "prod_12345",
  "quantity": -2,
  "reason": "damaged",
  "notes": "2 unidades danificadas durante transporte",
  "reference": "ADJ-2024-001"
}
```

### Transferência de Stock
```http
POST /api/stock/transfer
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "fromProductId": "prod_12345",
  "toProductId": "prod_67890",
  "quantity": 5,
  "reason": "reallocation",
  "notes": "Transferência entre localizações",
  "reference": "TRF-2024-001"
}
```

### Inventário Físico
```http
POST /api/stock/inventory
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "counts": [
    {
      "productId": "prod_12345",
      "countedQuantity": 73,
      "location": "A1-B2",
      "notes": "Contagem manual"
    },
    {
      "productId": "prod_67890",
      "countedQuantity": 45,
      "location": "A2-B1"
    }
  ],
  "reference": "INV-2024-001",
  "countedBy": "user_123",
  "countDate": "2024-01-15T14:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inventoryId": "inv_12345",
    "adjustments": [
      {
        "productId": "prod_12345",
        "systemQuantity": 75,
        "countedQuantity": 73,
        "difference": -2,
        "adjustmentId": "adj_123"
      }
    ],
    "summary": {
      "totalProducts": 2,
      "totalAdjustments": 1,
      "totalValueDifference": -900.00
    }
  }
}
```

### Alertas de Stock
```http
GET /api/stock/alerts
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` (string): Tipo de alerta (low_stock, out_of_stock, overstocked)
- `severity` (string): Severidade (low, medium, high, critical)
- `acknowledged` (boolean): Alertas reconhecidos

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "alert_12345",
      "type": "low_stock",
      "severity": "high",
      "productId": "prod_12345",
      "product": {
        "name": "Laptop Dell Inspiron 15",
        "sku": "LAPTOP-001"
      },
      "currentStock": 3,
      "minStock": 5,
      "message": "Stock abaixo do mínimo definido",
      "isAcknowledged": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "acknowledgedAt": null,
      "acknowledgedBy": null
    }
  ]
}
```

### Reconhecer Alerta
```http
PATCH /api/stock/alerts/{alertId}/acknowledge
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "notes": "Já foi feita encomenda ao fornecedor"
}
```

## Fornecedores

### Listar Fornecedores
```http
GET /api/suppliers
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`, `limit`: Paginação
- `search` (string): Pesquisa por nome, email ou telefone
- `isActive` (boolean): Filtrar por status ativo
- `country` (string): Filtrar por país

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sup_12345",
      "name": "TechDistribuidora Lda",
      "email": "vendas@techdist.pt",
      "phone": "+351912345678",
      "website": "https://www.techdist.pt",
      "taxNumber": "123456789",
      "address": {
        "street": "Rua da Tecnologia, 123",
        "city": "Lisboa",
        "postalCode": "1000-001",
        "country": "Portugal"
      },
      "contact": {
        "primaryContactName": "João Santos",
        "primaryContactEmail": "joao@techdist.pt",
        "primaryContactPhone": "+351912345679"
      },
      "terms": {
        "paymentTerms": "30 dias",
        "currency": "EUR",
        "minimumOrder": 1000.00,
        "deliveryTime": "3-5 dias úteis"
      },
      "categories": ["cat_123", "cat_456"],
      "rating": 4.5,
      "isActive": true,
      "isPreferred": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Obter Fornecedor por ID
```http
GET /api/suppliers/{supplierId}
Authorization: Bearer <token>
```

### Criar Fornecedor
```http
POST /api/suppliers
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Nova Empresa Lda",
  "email": "info@novaempresa.pt",
  "phone": "+351987654321",
  "website": "https://www.novaempresa.pt",
  "taxNumber": "987654321",
  "address": {
    "street": "Av. da Liberdade, 456",
    "city": "Porto",
    "postalCode": "4000-001",
    "country": "Portugal"
  },
  "contact": {
    "primaryContactName": "Maria Silva",
    "primaryContactEmail": "maria@novaempresa.pt",
    "primaryContactPhone": "+351987654322"
  },
  "terms": {
    "paymentTerms": "45 dias",
    "currency": "EUR",
    "minimumOrder": 500.00,
    "deliveryTime": "2-4 dias úteis"
  },
  "categories": ["cat_789"]
}
```

### Atualizar Fornecedor
```http
PUT /api/suppliers/{supplierId}
Authorization: Bearer <token>
```

### Eliminar Fornecedor
```http
DELETE /api/suppliers/{supplierId}
Authorization: Bearer <token>
```

### Produtos do Fornecedor
```http
GET /api/suppliers/{supplierId}/products
Authorization: Bearer <token>
```

### Histórico de Compras
```http
GET /api/suppliers/{supplierId}/purchases
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate`, `endDate`: Período
- `page`, `limit`: Paginação

## Clientes

### Listar Clientes
```http
GET /api/customers
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`, `limit`: Paginação
- `search` (string): Pesquisa por nome, email ou telefone
- `type` (string): Tipo de cliente (individual, business)
- `isActive` (boolean): Filtrar por status ativo
- `vip` (boolean): Apenas clientes VIP

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cust_12345",
      "type": "business",
      "name": "Empresa Cliente Lda",
      "email": "compras@empresacliente.pt",
      "phone": "+351911111111",
      "taxNumber": "111111111",
      "address": {
        "street": "Rua do Comércio, 789",
        "city": "Braga",
        "postalCode": "4700-001",
        "country": "Portugal"
      },
      "contact": {
        "primaryContactName": "Ana Costa",
        "primaryContactEmail": "ana@empresacliente.pt",
        "primaryContactPhone": "+351911111112"
      },
      "billing": {
        "paymentTerms": "30 dias",
        "creditLimit": 5000.00,
        "currentCredit": 1200.00,
        "discountPercentage": 5.0
      },
      "preferences": {
        "currency": "EUR",
        "language": "pt",
        "newsletter": true
      },
      "tags": ["vip", "enterprise"],
      "isActive": true,
      "isVip": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "lastPurchase": "2024-01-10T15:30:00Z"
    }
  ]
}
```

### Obter Cliente por ID
```http
GET /api/customers/{customerId}
Authorization: Bearer <token>
```

### Criar Cliente
```http
POST /api/customers
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "type": "individual",
  "name": "João Pessoa",
  "email": "joao@email.com",
  "phone": "+351922222222",
  "taxNumber": "222222222",
  "address": {
    "street": "Rua das Flores, 10",
    "city": "Coimbra",
    "postalCode": "3000-001",
    "country": "Portugal"
  },
  "billing": {
    "paymentTerms": "Pronto pagamento",
    "creditLimit": 1000.00
  },
  "preferences": {
    "currency": "EUR",
    "language": "pt",
    "newsletter": false
  }
}
```

### Atualizar Cliente
```http
PUT /api/customers/{customerId}
Authorization: Bearer <token>
```

### Eliminar Cliente
```http
DELETE /api/customers/{customerId}
Authorization: Bearer <token>
```

### Histórico de Compras do Cliente
```http
GET /api/customers/{customerId}/purchases
Authorization: Bearer <token>
```

### Estatísticas do Cliente
```http
GET /api/customers/{customerId}/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPurchases": 15,
    "totalValue": 12500.00,
    "averageOrderValue": 833.33,
    "lastPurchase": "2024-01-10T15:30:00Z",
    "preferredCategories": [
      { "categoryId": "cat_123", "count": 8 },
      { "categoryId": "cat_456", "count": 5 }
    ],
    "monthlySpending": [
      { "month": "2024-01", "value": 2500.00 },
      { "month": "2023-12", "value": 1800.00 }
    ]
  }
}
```

## Relatórios

### Dashboard Stats
```http
GET /api/reports/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
- `period` (string): Período (today, week, month, quarter, year)
- `startDate`, `endDate`: Período customizado

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProducts": 1250,
      "totalStock": 15000,
      "stockValue": 2500000.00,
      "lowStockItems": 15,
      "outOfStockItems": 3,
      "totalSuppliers": 45,
      "totalCustomers": 235,
      "activeUsers": 12
    },
    "sales": {
      "todayRevenue": 15000.00,
      "monthRevenue": 125000.00,
      "yearRevenue": 850000.00,
      "revenueGrowth": 12.5
    },
    "movements": {
      "todayMovements": 25,
      "weekMovements": 156,
      "monthMovements": 687
    },
    "alerts": {
      "lowStock": 15,
      "outOfStock": 3,
      "expired": 2,
      "pending": 8
    }
  }
}
```

### Relatório de Stock
```http
GET /api/reports/stock
Authorization: Bearer <token>
```

**Query Parameters:**
- `format` (string): Formato de saída (json, csv, pdf)
- `categoryId` (string): Filtrar por categoria
- `supplierId` (string): Filtrar por fornecedor
- `lowStock` (boolean): Apenas itens com stock baixo
- `includeInactive` (boolean): Incluir produtos inativos

### Relatório de Movimentos
```http
GET /api/reports/movements
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate`, `endDate`: Período obrigatório
- `format` (string): Formato (json, csv, pdf)
- `type` (string): Tipo de movimento
- `productId` (string): Filtrar por produto
- `userId` (string): Filtrar por utilizador

### Relatório de Vendas
```http
GET /api/reports/sales
Authorization: Bearer <token>
```

**Query Parameters:**
- `period` (string): Período predefinido
- `startDate`, `endDate`: Período customizado
- `format` (string): Formato
- `groupBy` (string): Agrupar por (day, week, month, product, customer, category)

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSales": 125000.00,
      "totalQuantity": 1250,
      "averageOrderValue": 100.00,
      "numberOfOrders": 1250,
      "topProducts": [
        {
          "productId": "prod_123",
          "name": "Laptop Dell",
          "quantity": 50,
          "revenue": 35000.00
        }
      ]
    },
    "breakdown": [
      {
        "date": "2024-01-15",
        "sales": 5000.00,
        "quantity": 50,
        "orders": 25
      }
    ]
  }
}
```

### Relatório de Fornecedores
```http
GET /api/reports/suppliers
Authorization: Bearer <token>
```

### Relatório de Clientes
```http
GET /api/reports/customers
Authorization: Bearer <token>
```

### Gerar Relatório Customizado
```http
POST /api/reports/custom
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Relatório Mensal Produtos Eletrónicos",
  "type": "products",
  "filters": {
    "categoryId": "cat_123",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z",
    "includeMovements": true
  },
  "format": "pdf",
  "schedule": {
    "frequency": "monthly",
    "day": 1,
    "time": "09:00"
  },
  "recipients": ["manager@company.com"]
}
```

### Estado do Relatório
```http
GET /api/reports/{reportId}/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "report_123",
    "status": "completed",
    "progress": 100,
    "fileUrl": "https://storage.googleapis.com/reports/report_123.pdf",
    "fileSize": 2048576,
    "generatedAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-22T10:30:00Z"
  }
}
```

## Utilizadores

### Listar Utilizadores
```http
GET /api/users
Authorization: Bearer <token>
```

**Requer permissão:** `users.read`

**Query Parameters:**
- `page`, `limit`: Paginação
- `search` (string): Pesquisa por nome ou email
- `role` (string): Filtrar por role (admin, manager, operator)
- `isActive` (boolean): Filtrar por status ativo

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "uid": "user_12345",
      "email": "joao@company.com",
      "name": "João Silva",
      "role": "manager",
      "department": "Warehouse",
      "isActive": true,
      "permissions": {
        "products": { "create": true, "read": true, "update": true, "delete": false },
        "stock": { "create": true, "read": true, "update": true, "delete": false }
      },
      "preferences": {
        "language": "pt",
        "timezone": "Europe/Lisbon",
        "notifications": {
          "email": true,
          "push": true,
          "lowStock": true,
          "newOrders": true
        }
      },
      "lastLogin": "2024-01-15T08:30:00Z",
      "createdAt": "2024-01-01T10:00:00Z",
      "createdBy": "user_admin"
    }
  ]
}
```

### Obter Utilizador por ID
```http
GET /api/users/{userId}
Authorization: Bearer <token>
```

### Criar Utilizador
```http
POST /api/users
Authorization: Bearer <token>
```

**Requer permissão:** `users.create`

**Request Body:**
```json
{
  "email": "novo@company.com",
  "name": "Novo Utilizador",
  "password": "password123",
  "role": "operator",
  "department": "Sales",
  "permissions": {
    "products": { "create": false, "read": true, "update": false, "delete": false },
    "stock": { "create": true, "read": true, "update": false, "delete": false }
  },
  "preferences": {
    "language": "pt",
    "timezone": "Europe/Lisbon"
  }
}
```

### Atualizar Utilizador
```http
PUT /api/users/{userId}
Authorization: Bearer <token>
```

**Requer permissão:** `users.update`

### Eliminar Utilizador
```http
DELETE /api/users/{userId}
Authorization: Bearer <token>
```

**Requer permissão:** `users.delete`

### Alterar Password
```http
POST /api/users/{userId}/change-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### Perfil do Utilizador Atual
```http
GET /api/users/me
Authorization: Bearer <token>
```

### Atualizar Perfil
```http
PATCH /api/users/me
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "João Silva Santos",
  "preferences": {
    "language": "en",
    "notifications": {
      "email": false,
      "push": true
    }
  }
}
```

### Atividade do Utilizador
```http
GET /api/users/{userId}/activity
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate`, `endDate`: Período
- `limit`: Número de atividades (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "activity_123",
      "action": "product.create",
      "resourceType": "product",
      "resourceId": "prod_456",
      "details": {
        "productName": "Novo Produto",
        "sku": "PROD-001"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Categorias

### Listar Categorias
```http
GET /api/categories
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_12345",
      "name": "Electrónicos",
      "description": "Produtos electrónicos em geral",
      "parentId": null,
      "level": 0,
      "path": "electrónicos",
      "slug": "electrónicos",
      "image": "https://storage.googleapis.com/bucket/electronics.jpg",
      "isActive": true,
      "productCount": 150,
      "metadata": {
        "taxRate": 23.0,
        "warranty": "2 anos"
      },
      "children": [
        {
          "id": "cat_67890",
          "name": "Laptops",
          "parentId": "cat_12345",
          "level": 1,
          "path": "electrónicos/laptops",
          "productCount": 45
        }
      ],
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Obter Categoria por ID
```http
GET /api/categories/{categoryId}
Authorization: Bearer <token>
```

### Criar Categoria
```http
POST /api/categories
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Smartphones",
  "description": "Telemóveis inteligentes",
  "parentId": "cat_12345",
  "image": "https://example.com/smartphones.jpg",
  "metadata": {
    "taxRate": 23.0,
    "warranty": "1 ano"
  }
}
```

### Atualizar Categoria
```http
PUT /api/categories/{categoryId}
Authorization: Bearer <token>
```

### Eliminar Categoria
```http
DELETE /api/categories/{categoryId}
Authorization: Bearer <token>
```

### Produtos da Categoria
```http
GET /api/categories/{categoryId}/products
Authorization: Bearer <token>
```

### Árvore de Categorias
```http
GET /api/categories/tree
Authorization: Bearer <token>
```

## Códigos de Resposta

### Códigos de Sucesso
- **200 OK**: Operação bem-sucedida
- **201 Created**: Recurso criado com sucesso
- **204 No Content**: Operação bem-sucedida sem conteúdo

### Códigos de Cliente
- **400 Bad Request**: Dados inválidos
- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Sem permissão
- **404 Not Found**: Recurso não encontrado
- **409 Conflict**: Conflito (ex: SKU duplicado)
- **422 Unprocessable Entity**: Erro de validação
- **429 Too Many Requests**: Rate limit excedido

### Códigos de Servidor
- **500 Internal Server Error**: Erro interno
- **502 Bad Gateway**: Erro de gateway
- **503 Service Unavailable**: Serviço indisponível

### Códigos de Erro Personalizados

```json
{
  "VALIDATION_ERROR": "Erro de validação",
  "DUPLICATE_SKU": "SKU já existe",
  "INSUFFICIENT_STOCK": "Stock insuficiente",
  "PRODUCT_NOT_FOUND": "Produto não encontrado",
  "SUPPLIER_NOT_FOUND": "Fornecedor não encontrado",
  "CUSTOMER_NOT_FOUND": "Cliente não encontrado",
  "PERMISSION_DENIED": "Permissão negada",
  "INVALID_TOKEN": "Token inválido",
  "TOKEN_EXPIRED": "Token expirado",
  "RATE_LIMIT_EXCEEDED": "Limite de requests excedido",
  "FILE_TOO_LARGE": "Ficheiro muito grande",
  "UNSUPPORTED_FILE_TYPE": "Tipo de ficheiro não suportado"
}
```

## Rate Limiting

### Limites por Endpoint

| Endpoint | Limite | Janela |
|----------|--------|--------|
| `/auth/login` | 5 requests | 15 minutos |
| `/auth/refresh` | 10 requests | 15 minutos |
| `/api/*` | 1000 requests | 1 hora |
| `/api/reports/*` | 10 requests | 1 hora |
| `/api/*/upload` | 20 requests | 1 hora |

### Headers de Rate Limiting

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

### Resposta de Rate Limit

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "window": 3600,
      "resetTime": "2024-01-15T11:00:00Z"
    }
  }
}
```

## Webhooks

### Configurar Webhook
```http
POST /api/webhooks
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "url": "https://yourapp.com/webhooks/stock",
  "events": ["product.created", "stock.low", "movement.created"],
  "secret": "webhook_secret_key",
  "active": true
}
```

### Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| `product.created` | Produto criado |
| `product.updated` | Produto atualizado |
| `product.deleted` | Produto eliminado |
| `stock.movement` | Movimento de stock |
| `stock.low` | Stock baixo |
| `stock.out` | Produto sem stock |
| `supplier.created` | Fornecedor criado |
| `customer.created` | Cliente criado |
| `user.created` | Utilizador criado |
| `report.generated` | Relatório gerado |

### Formato do Webhook

```json
{
  "id": "webhook_12345",
  "event": "product.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "prod_12345",
    "sku": "LAPTOP-001",
    "name": "Laptop Dell Inspiron"
  },
  "previous": null
}
```

### Verificação de Assinatura

```javascript
const crypto = require('crypto');

const signature = req.headers['x-webhook-signature'];
const body = JSON.stringify(req.body);
const secret = 'webhook_secret_key';

const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

const isValid = signature === expectedSignature;
```

Esta documentação fornece uma referência completa da API do Sistema de Gestão de Stock, incluindo todos os endpoints, parâmetros, exemplos de request/response e códigos de erro.