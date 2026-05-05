# Docker Deployment Guide

This guide covers deploying the Kavach authentication system using Docker and Docker Compose. Docker provides a consistent, portable deployment environment that works across development, staging, and production.

## Prerequisites

- Docker 20.0+ installed
- Docker Compose 2.0+ installed
- At least 2GB RAM available
- 10GB disk space available

## Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd kavach-auth-system
   cp .env.example .env
   ```

2. **Configure Environment**
   ```bash
   # Edit .env file with your configuration
   nano .env
   ```

3. **Start Services**
   ```bash
   docker-compose up -d
   ```

4. **Verify Deployment**
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

## Docker Compose Configuration

### Basic Setup

The `docker-compose.yml` file defines the complete application stack:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/kavach_auth
      - JWT_SECRET=${JWT_SECRET}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=kavach_auth
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Production Configuration

For production deployments, use `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  db:
    image: postgres:15-alpine
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    volumes:
      - /var/lib/postgresql/data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
```

## Dockerfile Configuration

### Multi-stage Production Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lock ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Create logs directory
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

CMD ["npm", "start"]
```

## Environment Configuration

### Required Environment Variables

Create a `.env` file with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://username:password@db:5432/kavach_auth
DB_HOST=db
DB_PORT=5432
DB_NAME=kavach_auth
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@your-domain.com

# Redis (for sessions and caching)
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

## Deployment Commands

### Development Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Production Deployment

```bash
# Deploy with production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale application instances
docker-compose up -d --scale app=3

# Update application
docker-compose pull
docker-compose up -d --no-deps app

# Backup database
docker-compose exec db pg_dump -U postgres kavach_auth > backup.sql
```

## Database Setup

### Initial Database Setup

```bash
# Run database migrations
docker-compose exec app npm run db:migrate

# Seed initial data
docker-compose exec app npm run db:seed

# Create admin user
docker-compose exec app npm run create-admin
```

### Database Backup and Restore

```bash
# Create backup
docker-compose exec db pg_dump -U postgres -d kavach_auth > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker-compose exec -T db psql -U postgres -d kavach_auth < backup.sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec db pg_dump -U postgres -d kavach_auth > "$BACKUP_DIR/backup_$DATE.sql"
find "$BACKUP_DIR" -name "backup_*.sql" -mtime +7 -delete
```

## Nginx Configuration

### Basic Nginx Setup

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        location /api/v1/health {
            proxy_pass http://app;
            access_log off;
        }
    }
}
```

## Monitoring and Health Checks

### Health Check Endpoints

The application provides several health check endpoints:

- `/api/v1/health` - Basic application health
- `/api/v1/health/detailed` - Detailed system status
- `/api/v1/metrics` - Prometheus metrics

### Docker Health Checks

```bash
# Check container health
docker-compose ps

# View health check logs
docker inspect --format='{{json .State.Health}}' container_name

# Manual health check
curl -f http://localhost:3000/api/v1/health
```

## Scaling and Performance

### Horizontal Scaling

```bash
# Scale application instances
docker-compose up -d --scale app=5

# Load balancing with nginx
upstream app {
    server app_1:3000;
    server app_2:3000;
    server app_3:3000;
    server app_4:3000;
    server app_5:3000;
}
```

### Resource Limits

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Security Considerations

### Container Security

- Use non-root user in containers
- Scan images for vulnerabilities
- Keep base images updated
- Use secrets management for sensitive data

### Network Security

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true

services:
  app:
    networks:
      - frontend
      - backend
  
  db:
    networks:
      - backend
```

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs app

# Check resource usage
docker stats

# Restart specific service
docker-compose restart app
```

**Database connection issues:**
```bash
# Test database connectivity
docker-compose exec app npm run db:test

# Check database logs
docker-compose logs db

# Reset database
docker-compose down -v
docker-compose up -d
```

**Performance issues:**
```bash
# Monitor resource usage
docker stats

# Check application metrics
curl http://localhost:3000/api/v1/metrics

# Scale up if needed
docker-compose up -d --scale app=3
```

### Log Management

```bash
# View real-time logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app

# Log rotation configuration
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Maintenance

### Regular Maintenance Tasks

```bash
# Update images
docker-compose pull
docker-compose up -d

# Clean up unused resources
docker system prune -f

# Backup database
docker-compose exec db pg_dump -U postgres kavach_auth > backup.sql

# Update SSL certificates
docker-compose restart nginx
```

### Monitoring Scripts

```bash
#!/bin/bash
# health-check.sh
if ! curl -f http://localhost:3000/api/v1/health; then
    echo "Application health check failed"
    docker-compose restart app
fi
```

## Next Steps

After successful Docker deployment:

1. Set up automated backups
2. Configure monitoring and alerting
3. Implement log aggregation
4. Plan disaster recovery procedures
5. Set up CI/CD pipeline for automated deployments

For production deployments, consider:
- Container orchestration with Kubernetes
- Service mesh for microservices
- Advanced monitoring with Prometheus and Grafana
- Centralized logging with ELK stack