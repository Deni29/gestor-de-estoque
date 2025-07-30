# API Reference

This document provides comprehensive API documentation for all Stock Management System microservices.

## Base URLs

- **Development**: `http://localhost:8080`
- **Production**: `https://api.stockmanagement.com`

## Authentication

All API endpoints require authentication using Firebase JWT tokens.

### Headers
```
Authorization: Bearer <firebase-jwt-token>
Content-Type: application/json
```

## Products Service

Base path: `/api/products`

### GET /products

Retrieve all products with optional filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term for product name or SKU
- `category` (optional): Filter by category ID
- `status` (optional): Filter by status (active, inactive)

**Example Request:**
```bash
GET /api/products?page=1&limit=10&search=laptop&category=electronics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod_123",
        "name": "Gaming Laptop",
        "sku": "LAP-GAM-001",
        "description": "High-performance gaming laptop",
        "category": "electronics",
        "price": 1299.99,
        "cost": 899.99,
        "stock": 15,
        "minStock": 5,
        "maxStock": 50,
        "status": "active",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    }
  }
}
```

### GET /products/:id

Retrieve a specific product by ID.

**Parameters:**
- `id`: Product ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prod_123",
    "name": "Gaming Laptop",
    "sku": "LAP-GAM-001",
    "description": "High-performance gaming laptop",
    "category": "electronics",
    "price": 1299.99,
    "cost": 899.99,
    "stock": 15,
    "minStock": 5,
    "maxStock": 50,
    "status": "active",
    "images": ["url1", "url2"],
    "attributes": {
      "brand": "TechCorp",
      "model": "GX-2000",
      "warranty": "2 years"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### POST /products

Create a new product.

**Request Body:**
```json
{
  "name": "Gaming Laptop",
  "sku": "LAP-GAM-001",
  "description": "High-performance gaming laptop",
  "category": "electronics",
  "price": 1299.99,
  "cost": 899.99,
  "minStock": 5,
  "maxStock": 50,
  "attributes": {
    "brand": "TechCorp",
    "model": "GX-2000",
    "warranty": "2 years"
  }
}
```

### PUT /products/:id

Update an existing product.

**Parameters:**
- `id`: Product ID

**Request Body:**
```json
{
  "name": "Updated Gaming Laptop",
  "price": 1199.99,
  "stock": 20
}
```

### DELETE /products/:id

Delete a product (soft delete - marks as inactive).

**Parameters:**
- `id`: Product ID

## Stock Service

Base path: `/api/stock`

### GET /stock/movements

Retrieve stock movement history.

**Query Parameters:**
- `productId` (optional): Filter by product ID
- `type` (optional): Movement type (in, out, adjustment)
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "movements": [
      {
        "id": "mov_123",
        "productId": "prod_123",
        "type": "in",
        "quantity": 10,
        "previousStock": 5,
        "newStock": 15,
        "reason": "Purchase order received",
        "reference": "PO-2024-001",
        "userId": "user_123",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### POST /stock/movements

Record a stock movement.

**Request Body:**
```json
{
  "productId": "prod_123",
  "type": "in",
  "quantity": 10,
  "reason": "Purchase order received",
  "reference": "PO-2024-001"
}
```

### GET /stock/alerts

Get low stock alerts.

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "productId": "prod_123",
        "productName": "Gaming Laptop",
        "sku": "LAP-GAM-001",
        "currentStock": 3,
        "minStock": 5,
        "alertLevel": "low"
      }
    ]
  }
}
```

## Suppliers Service

Base path: `/api/suppliers`

### GET /suppliers

Retrieve all suppliers.

**Response:**
```json
{
  "success": true,
  "data": {
    "suppliers": [
      {
        "id": "sup_123",
        "name": "TechCorp Supplies",
        "contactName": "John Smith",
        "email": "contact@techcorp.com",
        "phone": "+1-555-0123",
        "address": {
          "street": "123 Tech Street",
          "city": "Tech City",
          "state": "TC",
          "zipCode": "12345",
          "country": "USA"
        },
        "status": "active",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### POST /suppliers

Create a new supplier.

**Request Body:**
```json
{
  "name": "TechCorp Supplies",
  "contactName": "John Smith",
  "email": "contact@techcorp.com",
  "phone": "+1-555-0123",
  "address": {
    "street": "123 Tech Street",
    "city": "Tech City",
    "state": "TC",
    "zipCode": "12345",
    "country": "USA"
  }
}
```

## Customers Service

Base path: `/api/customers`

### GET /customers

Retrieve all customers.

**Query Parameters:**
- `search` (optional): Search by name or email
- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Items per page

### POST /customers

Create a new customer.

**Request Body:**
```json
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "+1-555-0123",
  "address": {
    "street": "123 Customer Street",
    "city": "Customer City",
    "state": "CC",
    "zipCode": "12345",
    "country": "USA"
  }
}
```

## Reports Service

Base path: `/api/reports`

### GET /reports/inventory

Generate inventory report.

**Query Parameters:**
- `format` (optional): Report format (json, csv, pdf)
- `category` (optional): Filter by category
- `lowStock` (optional): Include only low stock items

### GET /reports/sales

Generate sales report.

**Query Parameters:**
- `startDate`: Start date (ISO format)
- `endDate`: End date (ISO format)
- `format` (optional): Report format (json, csv, pdf)
- `groupBy` (optional): Group by (day, week, month)

### GET /reports/stock-movements

Generate stock movements report.

**Query Parameters:**
- `startDate`: Start date (ISO format)
- `endDate`: End date (ISO format)
- `productId` (optional): Filter by product
- `format` (optional): Report format (json, csv, pdf)

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "message": "Invalid email format"
    }
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `CONFLICT`: Resource already exists
- `INTERNAL_ERROR`: Server error

## Rate Limiting

- **Rate Limit**: 1000 requests per hour per user
- **Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## SDKs and Libraries

### JavaScript/TypeScript
```bash
npm install @stockmanagement/api-client
```

### Usage Example
```typescript
import { StockManagementAPI } from '@stockmanagement/api-client';

const api = new StockManagementAPI({
  baseURL: 'https://api.stockmanagement.com',
  token: 'your-firebase-jwt-token'
});

// Get products
const products = await api.products.list({
  page: 1,
  limit: 10
});

// Create product
const newProduct = await api.products.create({
  name: 'New Product',
  sku: 'NP-001',
  price: 99.99
});
```