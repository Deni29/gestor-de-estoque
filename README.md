# Sistema de Gestão de Stock Multiplataforma

Sistema completo de gestão de stock desenvolvido com arquitetura de microsserviços escalável, oferecendo interfaces web e móveis para gestão eficiente de inventário, produtos, fornecedores e relatórios.

## 🏗️ Arquitetura

### Tecnologias Principais

**Backend:**
- **Node.js + TypeScript** - Microsserviços
- **Firebase/Firestore** - Base de dados principal
- **Cloud SQL (PostgreSQL)** - Analytics e relatórios
- **Firebase Authentication** - Gestão de utilizadores
- **Cloud Storage** - Armazenamento de ficheiros
- **Cloud Run** - Deploy de microsserviços

**Frontend Web:**
- **React 18** - Interface web
- **Material-UI v5** - Design system
- **Redux Toolkit** - Gestão de estado
- **React Query** - Cache e sincronização de dados

**Mobile:**
- **Flutter** - App multiplataforma (iOS/Android)
- **BLoC Pattern** - Gestão de estado
- **Firebase SDK** - Integração com backend

**Infraestrutura:**
- **Docker + Docker Compose** - Containerização
- **Nginx** - API Gateway e Load Balancer
- **Cloud Build** - CI/CD
- **Cloud Monitoring** - Observabilidade

## 🚀 Funcionalidades

### Gestão de Produtos
- ✅ CRUD completo de produtos
- ✅ Códigos SKU e de barras únicos
- ✅ Categorização hierárquica
- ✅ Upload de imagens
- ✅ Especificações técnicas
- ✅ Preços e margens de lucro
- ✅ Pesquisa e filtragem avançada

### Gestão de Stock
- ✅ Registo de entradas e saídas
- ✅ Movimentos de stock com auditoria
- ✅ Alertas de stock mínimo/máximo
- ✅ Inventário físico
- ✅ Controlo de lotes e validades
- ✅ Transferências entre localizações

### Gestão de Fornecedores
- ✅ Base de dados de fornecedores
- ✅ Informações de contacto completas
- ✅ Histórico de compras
- ✅ Avaliação de fornecedores
- ✅ Condições de pagamento

### Gestão de Clientes
- ✅ Registo de clientes (individual/empresa)
- ✅ Histórico de vendas
- ✅ Limites de crédito
- ✅ Preferências de contacto

### Relatórios e Analytics
- ✅ Dashboard em tempo real
- ✅ Relatórios de stock
- ✅ Análise de vendas
- ✅ Tendências de produtos
- ✅ Exportação (PDF, CSV, Excel)
- ✅ KPIs personalizáveis

### Segurança e Utilizadores
- ✅ Autenticação multifator (2FA)
- ✅ Controlo de acesso baseado em roles (RBAC)
- ✅ Auditoria completa de ações
- ✅ Encriptação de dados
- ✅ Sessões seguras

### Funcionalidades Móveis
- ✅ Scanner de códigos de barras
- ✅ Interface otimizada para mobile
- ✅ Sincronização offline
- ✅ Notificações push
- ✅ Acesso rápido a alertas

## 📱 Interfaces

### Web Application
- **Dashboard** - Visão geral e métricas
- **Produtos** - Gestão completa de produtos
- **Stock** - Controlo de inventário
- **Fornecedores** - Gestão de fornecedores
- **Clientes** - Base de dados de clientes
- **Relatórios** - Analytics e exportações
- **Utilizadores** - Gestão de acessos (Admin)
- **Definições** - Configurações do sistema

### Mobile Application
- **Dashboard Mobile** - Métricas essenciais
- **Scanner** - Leitura de códigos de barras
- **Stock Rápido** - Entradas/saídas rápidas
- **Consultas** - Pesquisa de produtos
- **Alertas** - Notificações de stock
- **Inventário** - Contagens físicas

## 🛠️ Setup e Instalação

### Pré-requisitos
```bash
- Node.js 18+
- Docker & Docker Compose
- Flutter SDK 3.10+
- Firebase CLI
```

### 1. Clone o Repositório
```bash
git clone <repository-url>
cd stock-management-system
```

### 2. Configuração do Backend

#### Shared Library
```bash
cd backend/shared
npm install
npm run build
```

#### Products Service
```bash
cd backend/products
npm install
cp .env.example .env
# Configure variáveis de ambiente
npm run dev
```

#### Configuração Firebase
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Start emulators for development
firebase emulators:start
```

### 3. Configuração do Frontend Web
```bash
cd frontend/web
npm install
cp .env.example .env.local
# Configure variáveis de ambiente
npm run dev
```

### 4. Configuração da App Mobile
```bash
cd frontend/mobile
flutter pub get
flutter pub run build_runner build

# iOS
cd ios && pod install && cd ..
flutter run -d ios

# Android
flutter run -d android
```

### 5. Docker Compose (Desenvolvimento Completo)
```bash
cd infrastructure
docker-compose up -d
```

Acesso aos serviços:
- **Web App**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **Firebase Emulator UI**: http://localhost:4000
- **Grafana**: http://localhost:3001
- **Kibana**: http://localhost:5601

## 🏛️ Estrutura do Projeto

```
stock-management-system/
├── backend/
│   ├── shared/                 # Tipos e utilitários partilhados
│   ├── products/               # Serviço de produtos
│   ├── stock/                  # Serviço de stock
│   ├── suppliers/              # Serviço de fornecedores
│   ├── customers/              # Serviço de clientes
│   ├── reports/                # Serviço de relatórios
│   ├── auth/                   # Serviço de autenticação
│   └── notifications/          # Serviço de notificações
├── frontend/
│   ├── web/                    # Aplicação React
│   └── mobile/                 # Aplicação Flutter
├── infrastructure/
│   ├── docker-compose.yml      # Setup desenvolvimento
│   ├── kubernetes/             # Manifests K8s
│   ├── terraform/              # Infraestrutura como código
│   └── monitoring/             # Configuração de monitoring
├── docs/                       # Documentação
└── scripts/                    # Scripts de automação
```

## 🔧 API Endpoints

### Produtos
```http
GET    /api/products              # Listar produtos
POST   /api/products              # Criar produto
GET    /api/products/:id          # Obter produto
PUT    /api/products/:id          # Atualizar produto
DELETE /api/products/:id          # Eliminar produto
GET    /api/products/barcode/:code # Buscar por código de barras
```

### Stock
```http
GET    /api/stock                 # Estado atual do stock
POST   /api/stock/movements       # Registar movimento
GET    /api/stock/movements       # Histórico de movimentos
GET    /api/stock/alerts          # Alertas de stock
PUT    /api/stock/alerts/:id      # Resolver alerta
```

### Fornecedores
```http
GET    /api/suppliers             # Listar fornecedores
POST   /api/suppliers             # Criar fornecedor
GET    /api/suppliers/:id         # Obter fornecedor
PUT    /api/suppliers/:id         # Atualizar fornecedor
```

### Relatórios
```http
GET    /api/reports/dashboard     # Dados do dashboard
GET    /api/reports/stock         # Relatório de stock
GET    /api/reports/sales         # Relatório de vendas
POST   /api/reports/export        # Exportar relatório
```

## 🔐 Roles e Permissões

### Administrador
- Acesso total ao sistema
- Gestão de utilizadores
- Configurações avançadas
- Todos os relatórios

### Gestor
- Gestão de produtos e stock
- Gestão de fornecedores/clientes
- Relatórios operacionais
- Sem acesso a gestão de utilizadores

### Operador
- Apenas movimentos de stock
- Consulta de produtos
- Relatórios básicos
- Sem edição de dados mestres

## 📊 Monitorização

### Métricas Disponíveis
- **Performance**: Tempo de resposta, throughput
- **Disponibilidade**: Uptime dos serviços
- **Business**: Produtos cadastrados, movimentos de stock
- **Erros**: Taxa de erro, logs de exceções

### Dashboards
- **Sistema**: CPU, memória, rede
- **Aplicação**: Requests, latência, erros
- **Business**: KPIs de negócio

## 🚀 Deploy em Produção

### Google Cloud Platform
```bash
# Build e deploy dos serviços
gcloud builds submit --config cloudbuild.yaml

# Deploy da aplicação web
firebase deploy --only hosting

# Deploy das Cloud Functions
firebase deploy --only functions
```

### Kubernetes
```bash
cd infrastructure/kubernetes
kubectl apply -f namespace.yaml
kubectl apply -f configmaps/
kubectl apply -f secrets/
kubectl apply -f deployments/
kubectl apply -f services/
kubectl apply -f ingress.yaml
```

## 🧪 Testes

### Backend
```bash
# Testes unitários
npm run test

# Testes de integração
npm run test:integration

# Coverage
npm run test:coverage
```

### Frontend
```bash
# Web
npm run test
npm run test:coverage

# Mobile
flutter test
flutter test --coverage
```

## 📈 Performance

### Otimizações Implementadas
- **Lazy Loading** em componentes React
- **Infinite Scroll** para listas grandes
- **Caching** com React Query
- **Compressão** de imagens
- **CDN** para assets estáticos
- **Database Indexing** otimizado
- **Connection Pooling** no backend

### Benchmarks
- **Web**: First Contentful Paint < 1.5s
- **Mobile**: App startup < 2s
- **API**: P95 response time < 200ms
- **Database**: Query time < 100ms

## 🔧 Configuração

### Variáveis de Ambiente

#### Backend Services
```env
NODE_ENV=production
PORT=8080
FIREBASE_PROJECT_ID=your-project-id
FIRESTORE_DATABASE_URL=your-firestore-url
FIREBASE_PRIVATE_KEY=your-private-key
JWT_SECRET=your-jwt-secret
CORS_ORIGINS=https://yourdomain.com
```

#### Web Frontend
```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_FIREBASE_CONFIG={"apiKey":"..."}
REACT_APP_ENVIRONMENT=production
```

#### Mobile App
```dart
// lib/core/config/app_config.dart
class AppConfig {
  static const String apiUrl = 'https://api.yourdomain.com';
  static const String firebaseConfig = '...';
}
```

## 📚 Documentação Adicional

- [**Guia de Desenvolvimento**](docs/development-guide.md)
- [**API Reference**](docs/api-reference.md)
- [**Deployment Guide**](docs/deployment-guide.md)
- [**Troubleshooting**](docs/troubleshooting.md)
- [**Security Guide**](docs/security.md)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para a feature (`git checkout -b feature/AmazingFeature`)
3. Commit as mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Equipa

- **Backend Development** - Microsserviços e APIs
- **Frontend Development** - Interfaces web e mobile
- **DevOps** - Infraestrutura e deployment
- **UX/UI Design** - Design de interfaces

---

**Sistema de Gestão de Stock v1.0.0** - Desenvolvido com ❤️ para otimizar a gestão de inventário.
