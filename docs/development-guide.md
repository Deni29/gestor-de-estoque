# Guia de Desenvolvimento - Sistema de Gestão de Stock

## Índice
1. [Configuração do Ambiente](#configuração-do-ambiente)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Desenvolvimento Backend](#desenvolvimento-backend)
4. [Desenvolvimento Frontend](#desenvolvimento-frontend)
5. [Desenvolvimento Mobile](#desenvolvimento-mobile)
6. [Base de Dados](#base-de-dados)
7. [Testes](#testes)
8. [Debugging](#debugging)
9. [Boas Práticas](#boas-práticas)
10. [Workflow de Desenvolvimento](#workflow-de-desenvolvimento)

## Configuração do Ambiente

### Pré-requisitos
```bash
# Verificar versões
node --version    # >= 18.0.0
npm --version     # >= 8.0.0
docker --version  # >= 20.0.0
flutter --version # >= 3.10.0 (para mobile)
```

### Setup Inicial
```bash
# 1. Clone e configure
git clone <repository-url>
cd stock-management-system
chmod +x scripts/setup.sh
./scripts/setup.sh

# 2. Configure Firebase
firebase login
firebase use --add <your-project-id>

# 3. Configure variáveis de ambiente
cp backend/products/.env.example backend/products/.env
cp frontend/web/.env.example frontend/web/.env.local

# 4. Instale dependências
npm install
```

### Ferramentas Recomendadas
- **IDE**: VSCode com extensões:
  - TypeScript e JavaScript
  - Flutter/Dart
  - Firebase
  - Docker
  - GitLens
- **Terminal**: Terminal integrado ou iTerm2/WSL
- **Database**: Firebase Console + MongoDB Compass (opcional)
- **API Testing**: Postman ou Insomnia

## Estrutura do Projeto

```
stock-management-system/
├── backend/
│   ├── shared/                    # Biblioteca compartilhada
│   │   ├── src/
│   │   │   ├── types/            # Interfaces TypeScript
│   │   │   ├── utils/            # Utilitários
│   │   │   ├── middleware/       # Middleware compartilhado
│   │   │   └── validators/       # Validadores Joi
│   │   └── package.json
│   ├── products/                 # Microsserviço de produtos
│   │   ├── src/
│   │   │   ├── controllers/      # Controladores
│   │   │   ├── services/         # Lógica de negócio
│   │   │   ├── routes/           # Rotas Express
│   │   │   ├── middleware/       # Middleware específico
│   │   │   └── utils/            # Utilitários do serviço
│   │   ├── tests/                # Testes unitários
│   │   ├── Dockerfile
│   │   └── package.json
│   └── [outros microsserviços]/
├── frontend/
│   ├── web/                      # Aplicação React
│   │   ├── src/
│   │   │   ├── components/       # Componentes React
│   │   │   ├── pages/            # Páginas/Views
│   │   │   ├── hooks/            # Custom hooks
│   │   │   ├── services/         # API calls
│   │   │   ├── store/            # Redux store
│   │   │   ├── utils/            # Utilitários
│   │   │   └── types/            # Tipos TypeScript
│   │   └── public/
│   └── mobile/                   # Aplicação Flutter
│       ├── lib/
│       │   ├── core/             # Configurações centrais
│       │   ├── data/             # Camada de dados
│       │   ├── domain/           # Lógica de negócio
│       │   ├── presentation/     # UI e BLoCs
│       │   └── main.dart
│       └── pubspec.yaml
├── infrastructure/               # Infraestrutura
│   ├── docker-compose.yml
│   ├── kubernetes/
│   ├── terraform/
│   └── monitoring/
└── docs/                        # Documentação
```

## Desenvolvimento Backend

### Arquitetura dos Microsserviços

#### 1. Shared Library
**Propósito**: Tipos, utilitários e middleware compartilhados

```typescript
// backend/shared/src/types/index.ts
export interface Product {
  id: string;
  sku: string;
  name: string;
  // ... outros campos
}

// backend/shared/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});
```

#### 2. Products Service
**Estrutura típica de um microsserviço**:

```typescript
// src/controllers/ProductController.ts
export class ProductController {
  constructor(private productService: ProductService) {}

  async createProduct(req: Request, res: Response) {
    try {
      const product = await this.productService.createProduct(req.body, req.user.uid);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

// src/services/ProductService.ts
export class ProductService {
  constructor(private db: Firestore) {}

  async createProduct(data: CreateProductRequest, userId: string): Promise<Product> {
    // Validações
    await this.validateUniqueSKU(data.sku);
    
    // Criar produto
    const product = {
      id: uuidv4(),
      ...data,
      createdAt: Timestamp.now(),
      createdBy: userId
    };

    await this.db.collection('products').doc(product.id).set(product);
    return product;
  }
}

// src/routes/products.ts
const router = express.Router();

router.post('/', authMiddleware, permissionMiddleware(['products.create']), 
  validateCreateProduct, productController.createProduct);
```

### Desenvolvimento de Novos Microsserviços

#### 1. Criar estrutura básica
```bash
# Criar novo serviço
mkdir backend/suppliers
cd backend/suppliers
npm init -y

# Copiar estrutura do products service
cp -r ../products/src ./
cp ../products/Dockerfile ./
cp ../products/tsconfig.json ./
```

#### 2. Configurar package.json
```json
{
  "name": "stock-management-suppliers-service",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "../shared": "file:../shared",
    "express": "^4.18.2",
    // ... outras dependências
  }
}
```

#### 3. Implementar serviço
```typescript
// src/services/SupplierService.ts
export class SupplierService {
  async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    // Implementação específica do fornecedor
  }
}
```

### Middleware e Validações

#### Authentication Middleware
```typescript
// src/middleware/auth.ts
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedError();

    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await getUserById(decodedToken.uid);
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
};
```

#### Validation Middleware
```typescript
// src/middleware/validation.ts
import Joi from 'joi';

const createProductSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  sku: Joi.string().required().pattern(/^[A-Z0-9-]+$/),
  pricing: Joi.object({
    costPrice: Joi.number().positive().required(),
    salePrice: Joi.number().positive().required()
  }).required()
});

export const validateCreateProduct = (req: Request, res: Response, next: NextFunction) => {
  const { error } = createProductSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details
    });
  }
  next();
};
```

## Desenvolvimento Frontend

### Estrutura da Aplicação React

#### 1. Componentes
```tsx
// src/components/products/ProductCard.tsx
interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onEdit, 
  onDelete 
}) => {
  return (
    <Card sx={{ maxWidth: 345 }}>
      <CardMedia
        component="img"
        height="140"
        image={product.media.primaryImage || '/placeholder.jpg'}
        alt={product.name}
      />
      <CardContent>
        <Typography gutterBottom variant="h5">
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          SKU: {product.sku}
        </Typography>
        <Chip 
          label={`${product.inventory.currentStock} ${product.inventory.unit}`}
          color={getStockColor(product.inventory.currentStock, product.inventory.minStock)}
        />
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => onEdit(product)}>
          Editar
        </Button>
        <Button size="small" color="error" onClick={() => onDelete(product.id)}>
          Eliminar
        </Button>
      </CardActions>
    </Card>
  );
};
```

#### 2. Custom Hooks
```tsx
// src/hooks/useProducts.ts
export const useProducts = (filters?: ProductFilters) => {
  return useQuery(
    ['products', filters],
    () => productsApi.getProducts(filters),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation(productsApi.createProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Produto criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar produto');
    },
  });
};
```

#### 3. Redux Store
```typescript
// src/store/slices/authSlice.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    }
  }
});
```

#### 4. API Services
```typescript
// src/services/api/productsApi.ts
class ProductsApi {
  private baseURL = process.env.REACT_APP_API_URL + '/api/products';

  async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    
    const response = await fetch(`${this.baseURL}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    
    return response.json();
  }

  async createProduct(product: CreateProductRequest): Promise<Product> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(product)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  }
}

export const productsApi = new ProductsApi();
```

### Formulários e Validação

```tsx
// src/components/products/CreateProductForm.tsx
const productSchema = yup.object({
  name: yup.string().required('Nome é obrigatório').min(2).max(100),
  sku: yup.string().required('SKU é obrigatório').matches(/^[A-Z0-9-]+$/),
  pricing: yup.object({
    costPrice: yup.number().positive().required('Preço de custo é obrigatório'),
    salePrice: yup.number().positive().required('Preço de venda é obrigatório')
  })
});

export const CreateProductForm: React.FC = () => {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(productSchema)
  });

  const createProductMutation = useCreateProduct();

  const onSubmit = async (data: CreateProductRequest) => {
    try {
      await createProductMutation.mutateAsync(data);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Nome do Produto"
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
            margin="normal"
          />
        )}
      />
      
      <Controller
        name="sku"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="SKU"
            error={!!errors.sku}
            helperText={errors.sku?.message}
            fullWidth
            margin="normal"
          />
        )}
      />

      <Button 
        type="submit" 
        variant="contained" 
        disabled={createProductMutation.isLoading}
      >
        {createProductMutation.isLoading ? 'Criando...' : 'Criar Produto'}
      </Button>
    </form>
  );
};
```

## Desenvolvimento Mobile

### Arquitetura Flutter

#### 1. Clean Architecture
```dart
// lib/core/architecture/
abstract class UseCase<Type, Params> {
  Future<Either<Failure, Type>> call(Params params);
}

// lib/domain/usecases/get_products.dart
class GetProducts implements UseCase<List<Product>, GetProductsParams> {
  final ProductRepository repository;

  GetProducts(this.repository);

  @override
  Future<Either<Failure, List<Product>>> call(GetProductsParams params) async {
    return await repository.getProducts(params.filters);
  }
}
```

#### 2. BLoC Pattern
```dart
// lib/presentation/blocs/products/products_bloc.dart
class ProductsBloc extends Bloc<ProductsEvent, ProductsState> {
  final GetProducts getProducts;
  final CreateProduct createProduct;

  ProductsBloc({
    required this.getProducts,
    required this.createProduct,
  }) : super(ProductsInitial()) {
    on<LoadProducts>(_onLoadProducts);
    on<CreateProductRequested>(_onCreateProduct);
  }

  Future<void> _onLoadProducts(
    LoadProducts event,
    Emitter<ProductsState> emit,
  ) async {
    emit(ProductsLoading());
    
    final result = await getProducts(GetProductsParams(filters: event.filters));
    
    result.fold(
      (failure) => emit(ProductsError(failure.message)),
      (products) => emit(ProductsLoaded(products)),
    );
  }
}

// States
abstract class ProductsState extends Equatable {
  @override
  List<Object> get props => [];
}

class ProductsInitial extends ProductsState {}
class ProductsLoading extends ProductsState {}
class ProductsLoaded extends ProductsState {
  final List<Product> products;
  ProductsLoaded(this.products);
  
  @override
  List<Object> get props => [products];
}
class ProductsError extends ProductsState {
  final String message;
  ProductsError(this.message);
  
  @override
  List<Object> get props => [message];
}
```

#### 3. UI Components
```dart
// lib/presentation/widgets/product_card.dart
class ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback? onTap;
  final VoidCallback? onEdit;

  const ProductCard({
    Key? key,
    required this.product,
    this.onTap,
    this.onEdit,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: CachedNetworkImage(
          imageUrl: product.media.primaryImage ?? '',
          placeholder: (context, url) => const CircularProgressIndicator(),
          errorWidget: (context, url, error) => const Icon(Icons.inventory),
          width: 50,
          height: 50,
          fit: BoxFit.cover,
        ),
        title: Text(product.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('SKU: ${product.sku}'),
            Chip(
              label: Text('${product.inventory.currentStock} ${product.inventory.unit}'),
              backgroundColor: _getStockColor(product.inventory),
              size: MaterialTapTargetSize.shrinkWrap,
            ),
          ],
        ),
        trailing: IconButton(
          icon: const Icon(Icons.edit),
          onPressed: onEdit,
        ),
        onTap: onTap,
      ),
    );
  }

  Color _getStockColor(ProductInventory inventory) {
    if (inventory.currentStock == 0) return Colors.red;
    if (inventory.currentStock <= inventory.minStock) return Colors.orange;
    return Colors.green;
  }
}
```

#### 4. Scanner Implementation
```dart
// lib/presentation/pages/scanner/barcode_scanner_page.dart
class BarcodeScannerPage extends StatefulWidget {
  @override
  _BarcodeScannerPageState createState() => _BarcodeScannerPageState();
}

class _BarcodeScannerPageState extends State<BarcodeScannerPage> {
  final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');
  QRViewController? controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scanner de Códigos')),
      body: Column(
        children: [
          Expanded(
            flex: 5,
            child: QRView(
              key: qrKey,
              onQRViewCreated: _onQRViewCreated,
              overlay: QrScannerOverlayShape(
                borderColor: Colors.red,
                borderRadius: 10,
                borderLength: 30,
                borderWidth: 10,
                cutOutSize: 250,
              ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Center(
              child: Text('Posicione o código de barras dentro do quadrado'),
            ),
          )
        ],
      ),
    );
  }

  void _onQRViewCreated(QRViewController controller) {
    this.controller = controller;
    controller.scannedDataStream.listen((scanData) {
      if (scanData.code != null) {
        _handleBarcode(scanData.code!);
      }
    });
  }

  void _handleBarcode(String barcode) {
    // Buscar produto por código de barras
    context.read<ProductsBloc>().add(SearchProductByBarcode(barcode));
    Navigator.pop(context, barcode);
  }
}
```

## Base de Dados

### Firestore Schema

#### 1. Estrutura de Collections
```javascript
// products/{productId}
{
  id: "product_123",
  sku: "PROD-001",
  name: "Produto Exemplo",
  pricing: {
    costPrice: 10.50,
    salePrice: 15.99,
    currency: "EUR"
  },
  inventory: {
    currentStock: 100,
    minStock: 10,
    maxStock: 500,
    unit: "un"
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isActive: true
}
```

#### 2. Índices Compostos
```javascript
// firebase/firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "categoryId", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "stockMovements",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "productId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

#### 3. Security Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Products - role-based access
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      hasRole(['admin', 'manager']) &&
                      hasPermission('products', 'write');
    }

    function hasRole(roles) {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in roles;
    }

    function hasPermission(resource, action) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid))
             .data.permissions[resource][action] == true;
    }
  }
}
```

### Queries Otimizadas

#### 1. Produtos com Filtros
```typescript
// Busca otimizada com índices
async function getProductsWithFilters(filters: ProductFilters) {
  let query = db.collection('products')
    .where('isActive', '==', true);

  if (filters.categoryId) {
    query = query.where('categoryId', '==', filters.categoryId);
  }

  if (filters.supplierId) {
    query = query.where('supplierId', '==', filters.supplierId);
  }

  // Sempre ordenar por um campo indexado
  query = query.orderBy('updatedAt', 'desc');

  // Paginação
  if (filters.startAfter) {
    query = query.startAfter(filters.startAfter);
  }

  return query.limit(filters.limit || 20).get();
}
```

#### 2. Aggregation Queries
```typescript
// Para dashboards - usar subcoleções para agregados
async function getDashboardStats() {
  const statsDoc = await db.collection('analytics')
    .doc('dashboard')
    .get();

  if (!statsDoc.exists) {
    // Calcular e cachear
    return await calculateAndCacheStats();
  }

  return statsDoc.data();
}

// Cloud Function para atualizar stats
exports.updateDashboardStats = functions.firestore
  .document('stockMovements/{movementId}')
  .onCreate(async (snap, context) => {
    // Atualizar estatísticas agregadas
    await updateAggregatedStats();
  });
```

## Testes

### Backend Testing

#### 1. Testes Unitários
```typescript
// tests/services/ProductService.test.ts
import { ProductService } from '../src/services/ProductService';
import { Firestore } from '@google-cloud/firestore';

jest.mock('@google-cloud/firestore');

describe('ProductService', () => {
  let productService: ProductService;
  let mockDb: jest.Mocked<Firestore>;

  beforeEach(() => {
    mockDb = new Firestore() as jest.Mocked<Firestore>;
    productService = new ProductService(mockDb);
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const productData = {
        name: 'Test Product',
        sku: 'TEST-001',
        pricing: { costPrice: 10, salePrice: 15, currency: 'EUR' }
      };

      const mockCollection = {
        doc: jest.fn().mockReturnValue({
          set: jest.fn().mockResolvedValue({})
        })
      };

      mockDb.collection = jest.fn().mockReturnValue(mockCollection);

      const result = await productService.createProduct(productData, 'user123');

      expect(result).toBeDefined();
      expect(result.name).toBe(productData.name);
      expect(mockDb.collection).toHaveBeenCalledWith('products');
    });

    it('should throw error for duplicate SKU', async () => {
      const productData = {
        name: 'Test Product',
        sku: 'EXISTING-SKU',
        pricing: { costPrice: 10, salePrice: 15, currency: 'EUR' }
      };

      const mockSnapshot = {
        docs: [{ id: 'existing-product' }]
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection = jest.fn().mockReturnValue(mockQuery);

      await expect(
        productService.createProduct(productData, 'user123')
      ).rejects.toThrow('Product with SKU \'EXISTING-SKU\' already exists');
    });
  });
});
```

#### 2. Testes de Integração
```typescript
// tests/integration/products.test.ts
import request from 'supertest';
import app from '../src/index';
import { setupTestDb, cleanupTestDb } from './helpers/testDb';

describe('Products API', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('POST /api/products', () => {
    it('should create a product', async () => {
      const productData = {
        name: 'Integration Test Product',
        sku: 'INT-001',
        pricing: { costPrice: 10, salePrice: 15, currency: 'EUR' }
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${getTestToken()}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
    });
  });
});
```

### Frontend Testing

#### 1. Component Tests
```tsx
// src/components/__tests__/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

const mockProduct = {
  id: '1',
  name: 'Test Product',
  sku: 'TEST-001',
  inventory: { currentStock: 10, minStock: 5, unit: 'un' },
  media: { primaryImage: 'test.jpg' }
};

describe('ProductCard', () => {
  it('renders product information', () => {
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();

    render(
      <ProductCard 
        product={mockProduct} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
      />
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('SKU: TEST-001')).toBeInTheDocument();
    expect(screen.getByText('10 un')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();

    render(
      <ProductCard 
        product={mockProduct} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
      />
    );

    fireEvent.click(screen.getByText('Editar'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockProduct);
  });
});
```

### Mobile Testing

#### 1. Unit Tests
```dart
// test/domain/usecases/get_products_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dartz/dartz.dart';

class MockProductRepository extends Mock implements ProductRepository {}

void main() {
  late GetProducts usecase;
  late MockProductRepository mockRepository;

  setUp(() {
    mockRepository = MockProductRepository();
    usecase = GetProducts(mockRepository);
  });

  test('should get products from repository', () async {
    // arrange
    final tProducts = [Product(id: '1', name: 'Test Product')];
    when(() => mockRepository.getProducts(any()))
        .thenAnswer((_) async => Right(tProducts));

    // act
    final result = await usecase(GetProductsParams());

    // assert
    expect(result, Right(tProducts));
    verify(() => mockRepository.getProducts(any()));
    verifyNoMoreInteractions(mockRepository);
  });
}
```

#### 2. Widget Tests
```dart
// test/presentation/widgets/product_card_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('ProductCard displays product information', (tester) async {
    final product = Product(
      id: '1',
      name: 'Test Product',
      sku: 'TEST-001',
      inventory: ProductInventory(currentStock: 10, unit: 'un'),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: ProductCard(product: product),
      ),
    );

    expect(find.text('Test Product'), findsOneWidget);
    expect(find.text('SKU: TEST-001'), findsOneWidget);
    expect(find.text('10 un'), findsOneWidget);
  });
}
```

## Debugging

### Backend Debugging

#### 1. Logging Strategy
```typescript
// src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Usage
logger.info('Product created', { productId, userId });
logger.error('Failed to create product', { error: error.message, stack: error.stack });
```

#### 2. Debug Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Products Service",
      "program": "${workspaceFolder}/backend/products/src/index.ts",
      "outFiles": ["${workspaceFolder}/backend/products/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development",
        "PORT": "8081"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Frontend Debugging

#### 1. Redux DevTools
```typescript
// src/store/store.ts
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});
```

#### 2. React Query DevTools
```tsx
// src/App.tsx
import { ReactQueryDevtools } from 'react-query/devtools';

function App() {
  return (
    <div>
      {/* App content */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </div>
  );
}
```

### Mobile Debugging

#### 1. Flutter Inspector
```bash
# Run app in debug mode
flutter run --debug

# Enable logging
flutter logs
```

#### 2. Debug Prints
```dart
// Use debugPrint instead of print
debugPrint('Product loaded: ${product.name}');

// Conditional debugging
if (kDebugMode) {
  print('Debug info: $debugInfo');
}
```

## Boas Práticas

### 1. Código Limpo
- **Single Responsibility**: Cada classe/função tem uma responsabilidade
- **DRY**: Don't Repeat Yourself
- **SOLID**: Princípios de design orientado a objetos
- **Clean Architecture**: Separação clara de camadas

### 2. Tratamento de Erros
```typescript
// Backend - Error handling
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Frontend - Error boundaries
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### 3. Performance
- **Lazy Loading**: Carregar componentes sob demanda
- **Memoization**: React.memo, useMemo, useCallback
- **Debouncing**: Para pesquisas e inputs
- **Pagination**: Para listas grandes
- **Caching**: React Query, Redux

### 4. Security
- **Input Validation**: Tanto frontend quanto backend
- **Sanitization**: Limpar dados de entrada
- **Authentication**: Tokens JWT seguros
- **Authorization**: Verificar permissões
- **HTTPS**: Sempre usar conexões seguras

## Workflow de Desenvolvimento

### 1. Git Flow
```bash
# Feature development
git checkout develop
git pull origin develop
git checkout -b feature/add-supplier-management
# ... development work
git add .
git commit -m "feat: add supplier CRUD operations"
git push origin feature/add-supplier-management
# Create Pull Request

# Hotfix
git checkout main
git checkout -b hotfix/fix-stock-calculation
# ... fix
git commit -m "fix: correct stock calculation algorithm"
```

### 2. Code Review
- **Automated checks**: Linting, testing, build
- **Manual review**: Logic, architecture, performance
- **Documentation**: Comments, README updates
- **Testing**: Unit tests, integration tests

### 3. Release Process
```bash
# Prepare release
git checkout develop
git checkout -b release/v1.1.0
# Update version numbers
# Update CHANGELOG.md
git commit -m "chore: prepare release v1.1.0"
git checkout main
git merge release/v1.1.0
git tag v1.1.0
git push origin main --tags
```

### 4. Environment Management
- **Development**: Local com emuladores
- **Staging**: Environment de teste
- **Production**: Environment real

```env
# .env.development
NODE_ENV=development
FIREBASE_PROJECT_ID=project-dev
API_URL=http://localhost:8080

# .env.production
NODE_ENV=production
FIREBASE_PROJECT_ID=project-prod
API_URL=https://api.stockmanagement.com
```

---

Este guia fornece uma base sólida para o desenvolvimento do sistema. Para questões específicas, consulte a documentação das tecnologias utilizadas ou contacte a equipa de desenvolvimento.
