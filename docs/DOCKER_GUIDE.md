# Docker Deployment Guide

Complete guide untuk deploy aplikasi Express.js TypeScript boilerplate menggunakan Docker.

## 📋 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) v20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) v2.0+

## 🚀 Quick Start

### 1. Setup Environment Variables

```bash
# Copy template environment file
cp .env.docker .env

# Generate secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env and update:
# - DATA_ENCRYPTION_KEY (use generated key)
# - JWT_SECRET
# - JWT_REFRESH_SECRET
# - Database passwords
# - Redis password
# - MinIO password
nano .env
```

### 2. Build and Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 3. Run Database Migrations

```bash
# Run Prisma migrations
docker-compose exec app npx prisma migrate deploy

# (Optional) Generate Prisma client if needed
docker-compose exec app npx prisma generate
```

### 4. Access Services

- **Application**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **MinIO Console**: http://localhost:9001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│               Docker Network                     │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │PostgreSQL│  │  Redis   │  │  MinIO   │      │
│  │  :5432   │  │  :6379   │  │  :9000   │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │             │              │
│       └─────────────┴─────────────┘              │
│                     │                            │
│              ┌──────┴──────┐                     │
│              │  Express    │                     │
│              │  App :3000  │                     │
│              └─────────────┘                     │
└─────────────────────────────────────────────────┘
                      ▲
                      │
                   Port 3000
```

## 📦 Services

### 1. PostgreSQL

- **Image**: postgres:16-alpine
- **Port**: 5432
- **Volume**: postgres_data
- **Health Check**: pg_isready

### 2. Redis

- **Image**: redis:7-alpine
- **Port**: 6379
- **Volume**: redis_data
- **Features**: Rate limiting, token caching

### 3. MinIO

- **Image**: minio/minio:latest
- **API Port**: 9000
- **Console Port**: 9001
- **Volume**: minio_data
- **Default Credentials**: minioadmin/minioadmin

### 4. Express App

- **Build**: Multi-stage Dockerfile
- **Port**: 3000
- **User**: Non-root (nodejs:1001)
- **Health Check**: /health endpoint

## 🔧 Common Commands

### Service Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart app

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f app

# Check service status
docker-compose ps
```

### Database Operations

```bash
# Run migrations
docker-compose exec app npx prisma migrate deploy

# Create new migration
docker-compose exec app npx prisma migrate dev --name your_migration_name

# Open Prisma Studio
docker-compose exec app npx prisma studio

# Database shell
docker-compose exec postgres psql -U postgres -d expressdb

# Backup database
docker-compose exec postgres pg_dump -U postgres expressdb > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres expressdb < backup.sql
```

### Redis Operations

```bash
# Redis CLI
docker-compose exec redis redis-cli -a redis123

# Flush all cache
docker-compose exec redis redis-cli -a redis123 FLUSHALL

# Monitor Redis commands
docker-compose exec redis redis-cli -a redis123 MONITOR
```

### MinIO Operations

```bash
# MinIO client (mc) commands
docker-compose exec minio mc alias set myminio http://localhost:9000 minioadmin minioadmin

# Create bucket
docker-compose exec minio mc mb myminio/uploads

# List buckets
docker-compose exec minio mc ls myminio
```

### Application Operations

```bash
# Shell into app container
docker-compose exec app sh

# Run npm commands
docker-compose exec app npm run lint

# Generate test data
docker-compose exec app npm run generate-data

# Generate API key
docker-compose exec app npm run generate-api-key
```

## 🔄 Development vs Production

### Development (with hot reload)

Create `docker-compose.dev.yml`:

```yaml
version: "3.8"

services:
    app:
        build:
            context: .
            dockerfile: Dockerfile
            target: dependencies
        command: npm run dev
        volumes:
            - .:/app
            - /app/node_modules
        environment:
            NODE_ENV: development
```

Run with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production

Use default `docker-compose.yml`:

```bash
docker-compose up -d
```

## 🛠️ Build Options

### Build Specific Stage

```bash
# Build only dependencies stage
docker build --target dependencies -t express-deps .

# Build production stage
docker build --target production -t express-app .
```

### Custom Build Args

```bash
docker build \
  --build-arg NODE_VERSION=20 \
  -t express-app:custom .
```

## 📊 Monitoring & Logs

### View Resource Usage

```bash
# Container stats
docker stats

# Specific container
docker stats express-app
```

### Log Management

```bash
# Follow logs
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app

# Since timestamp
docker-compose logs --since 2024-01-01T00:00:00 app
```

## 🔒 Security Best Practices

### 1. Environment Variables

```bash
# Never commit .env file
echo ".env" >> .gitignore

# Use strong passwords
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Non-Root User

App runs as `nodejs` user (UID 1001) - already configured in Dockerfile

### 3. Read-Only Filesystem

Add to docker-compose.yml if needed:

```yaml
app:
    read_only: true
    tmpfs:
        - /tmp
```

### 4. Resource Limits

```yaml
app:
    deploy:
        resources:
            limits:
                cpus: "1"
                memory: 512M
            reservations:
                cpus: "0.5"
                memory: 256M
```

## 🧪 Testing in Docker

```bash
# Run tests
docker-compose exec app npm test

# Run with coverage
docker-compose exec app npm run test:coverage
```

## 🚨 Troubleshooting

### Issue: Port already in use

```bash
# Check what's using the port
lsof -i :3000

# Change port in .env
APP_PORT=3001
```

### Issue: Database connection failed

```bash
# Check PostgreSQL is healthy
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d
```

### Issue: MinIO bucket not found

```bash
# Create bucket manually
docker-compose exec app node -e "
const { S3Client, CreateBucketCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({
  endpoint: 'http://minio:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin'
  },
  region: 'us-east-1',
  forcePathStyle: true
});
s3.send(new CreateBucketCommand({ Bucket: 'uploads' }))
  .then(() => console.log('Bucket created'))
  .catch(console.error);
"
```

### Issue: Out of disk space

```bash
# Clean up unused images
docker image prune -a

# Clean up volumes (WARNING: deletes data)
docker volume prune

# Clean everything
docker system prune -a --volumes
```

## 📈 Production Deployment

### Deploy to Server

```bash
# Copy files to server
rsync -avz --exclude node_modules . user@server:/app

# SSH to server
ssh user@server

# Navigate to app directory
cd /app

# Start services
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

### Using Docker Swarm (Optional)

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml express-stack

# List services
docker service ls

# Scale app
docker service scale express-stack_app=3
```

## 🔄 Updates & Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

### Backup & Restore

```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U postgres expressdb > backup_$DATE.sql
docker-compose exec minio mc mirror myminio/uploads ./minio_backup_$DATE

# Restore script
#!/bin/bash
docker-compose exec -T postgres psql -U postgres expressdb < backup.sql
docker-compose exec minio mc mirror ./minio_backup myminio/uploads
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

**Happy Dockerizing! 🐳**
