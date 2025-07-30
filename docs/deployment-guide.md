# Deployment Guide

This guide covers deploying the Stock Management System to production environments.

## 🏗️ Deployment Architecture

The system supports multiple deployment strategies:

1. **Docker Containers** (Recommended)
2. **Firebase Hosting** (Frontend)
3. **Cloud Run** (Backend Services)
4. **Traditional VPS/Dedicated Servers**

## 🐳 Docker Deployment (Recommended)

### Prerequisites

- Docker Engine (>= 20.0)
- Docker Compose (>= 2.0)
- 4GB+ RAM
- 20GB+ disk space

### Quick Deployment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/org/stock-management.git
   cd stock-management
   ```

2. **Configure environment:**
   ```bash
   cp infrastructure/.env.example infrastructure/.env
   # Edit .env file with your configuration
   ```

3. **Deploy with Docker Compose:**
   ```bash
   cd infrastructure
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Production Docker Configuration

Create `infrastructure/docker-compose.prod.yml`:

```yaml
version: '3.8'
services:
  # API Gateway
  api-gateway:
    image: stockmanagement/api-gateway:latest
    ports:
      - "80:8080"
      - "443:8443"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./ssl:/etc/ssl/certs
    depends_on:
      - products-service
      - stock-service

  # Products Service
  products-service:
    image: stockmanagement/products-service:latest
    environment:
      - NODE_ENV=production
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
    scale: 2

  # Stock Service
  stock-service:
    image: stockmanagement/stock-service:latest
    environment:
      - NODE_ENV=production
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
    scale: 2

  # Database
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups

  # Redis Cache
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  # Monitoring
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  postgres_data:
  redis_data:
  grafana_data:
```

## ☁️ Cloud Deployment

### Google Cloud Platform

#### 1. Cloud Run Deployment

```bash
# Build and push images
docker build -t gcr.io/your-project/products-service ./backend/products
docker push gcr.io/your-project/products-service

# Deploy to Cloud Run
gcloud run deploy products-service \
  --image gcr.io/your-project/products-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### 2. Firebase Hosting (Frontend)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and configure
firebase login
firebase init hosting

# Build and deploy
cd frontend/web
npm run build
firebase deploy --only hosting
```

### AWS Deployment

#### 1. ECS with Fargate

```yaml
# ecs-task-definition.json
{
  "family": "stock-management",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "products-service",
      "image": "your-account.dkr.ecr.region.amazonaws.com/products-service:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ]
    }
  ]
}
```

#### 2. Deploy with AWS CLI

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name stock-management

# Register task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster stock-management \
  --service-name products-service \
  --task-definition stock-management:1 \
  --desired-count 2 \
  --launch-type FARGATE
```

## 🔧 Environment Configuration

### Required Environment Variables

#### Backend Services

```bash
# Core Configuration
NODE_ENV=production
PORT=8080
JWT_SECRET=your-super-secret-jwt-key

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/stock_management
REDIS_URL=redis://localhost:6379

# External Services
SENDGRID_API_KEY=your-sendgrid-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-west-2
AWS_S3_BUCKET=your-s3-bucket
```

#### Frontend Configuration

```bash
# API Configuration
REACT_APP_API_URL=https://api.stockmanagement.com
REACT_APP_FIREBASE_CONFIG='{"apiKey":"...","authDomain":"...","projectId":"..."}'

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_NOTIFICATIONS=true
```

## 🔒 SSL/TLS Configuration

### Let's Encrypt with Nginx

1. **Install Certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name api.stockmanagement.com;
       
       location / {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Generate Certificate:**
   ```bash
   sudo certbot --nginx -d api.stockmanagement.com
   ```

## 📊 Database Setup

### PostgreSQL Production Setup

1. **Install PostgreSQL:**
   ```bash
   sudo apt install postgresql postgresql-contrib
   ```

2. **Create Database and User:**
   ```sql
   CREATE DATABASE stock_management;
   CREATE USER stock_user WITH ENCRYPTED PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE stock_management TO stock_user;
   ```

3. **Configure PostgreSQL:**
   ```bash
   # Edit /etc/postgresql/14/main/postgresql.conf
   listen_addresses = '*'
   max_connections = 200
   shared_buffers = 256MB
   
   # Edit /etc/postgresql/14/main/pg_hba.conf
   host    stock_management    stock_user    0.0.0.0/0    md5
   ```

## 🔄 Backup Strategy

### Database Backups

1. **Automated Backup Script:**
   ```bash
   #!/bin/bash
   # backup-db.sh
   
   BACKUP_DIR="/backups/postgresql"
   DB_NAME="stock_management"
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   
   mkdir -p $BACKUP_DIR
   
   pg_dump -h localhost -U stock_user -d $DB_NAME > \
     $BACKUP_DIR/stock_management_$TIMESTAMP.sql
   
   # Keep only last 7 days
   find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
   ```

2. **Cron Job:**
   ```bash
   # Run daily at 2 AM
   0 2 * * * /path/to/backup-db.sh
   ```

### File Backups

```bash
# Backup uploaded files to S3
aws s3 sync /data/uploads s3://your-backup-bucket/uploads --delete
```

## 📈 Monitoring and Observability

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'stock-management'
    static_configs:
      - targets: ['localhost:8080', 'localhost:8081']
```

### Grafana Dashboard

Import the provided dashboard configuration:
- `infrastructure/monitoring/grafana-dashboard.json`

### Health Checks

Each service exposes health check endpoints:
- `/health` - Basic health check
- `/health/ready` - Readiness check
- `/health/live` - Liveness check

## 🚀 Deployment Checklist

### Pre-deployment

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations run
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] DNS records configured
- [ ] Firewall rules configured

### Deployment Steps

1. **Build and tag images:**
   ```bash
   npm run build:prod
   docker build -t stockmanagement/api:v1.0.0 .
   ```

2. **Run database migrations:**
   ```bash
   npm run migrate:prod
   ```

3. **Deploy services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Verify deployment:**
   ```bash
   curl https://api.stockmanagement.com/health
   ```

### Post-deployment

- [ ] Health checks passing
- [ ] Logs are being collected
- [ ] Metrics are being reported
- [ ] Backup jobs scheduled
- [ ] Security scan completed
- [ ] Performance testing completed

## 🔧 Troubleshooting

### Common Issues

1. **Service won't start:**
   ```bash
   # Check logs
   docker logs container-name
   
   # Check environment variables
   docker exec container-name env
   ```

2. **Database connection issues:**
   ```bash
   # Test connection
   psql -h hostname -U username -d database_name
   
   # Check firewall
   telnet hostname 5432
   ```

3. **Memory issues:**
   ```bash
   # Monitor memory usage
   docker stats
   
   # Increase memory limit
   docker update --memory 2g container-name
   ```

## 📚 Additional Resources

- [Infrastructure Documentation](deployment/infrastructure.md)
- [Monitoring Setup](deployment/monitoring.md)
- [Security Best Practices](security.md)
- [Troubleshooting Guide](troubleshooting.md)