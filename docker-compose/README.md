# PienoSmart Docker Compose Environments

This directory contains Docker Compose configurations for different deployment environments.

## 📁 Files Overview

- `docker-compose.preprod.yml` - Full pre-production environment with optional nginx reverse proxy
- `docker-compose.preprod.basic.yml` - Simplified pre-production environment (recommended for most cases)
- `.env.preprod.example` - Environment variables template for pre-production

## 🚀 Quick Start (Basic Setup)

### 1. Prepare Environment Variables

```bash
# Copy the example environment file
cp .env.preprod.example .env.preprod

# Edit with your settings
nano .env.preprod
```

### 2. Start the Pre-Production Environment

```bash
# From the project root directory
docker-compose -f docker-compose/docker-compose.preprod.basic.yml --env-file docker-compose/.env.preprod up -d
```

### 3. Verify Services

```bash
# Check service status
docker-compose -f docker-compose/docker-compose.preprod.basic.yml ps

# View logs
docker-compose -f docker-compose/docker-compose.preprod.basic.yml logs -f

# Check health
curl http://localhost:3000          # Frontend
curl http://localhost:8000/api/docs # Backend API
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **API Documentation**: http://localhost:8000/docs

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | `postgres` | PostgreSQL database password |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `FRONTEND_API_BASE_URL` | `http://localhost:8000/api` | API endpoint for frontend |
| `DEV_USER_EMAIL` | `demo@pienosmart.local` | Development user email |
| `DEV_USER_DISPLAY_NAME` | `Demo User` | Development user display name |
| `DEV_USER_SUBJECT` | `dev-local-user` | Development user subject |

### Service Ports

| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| Database | 5432 | 5432 | PostgreSQL with PostGIS |
| Backend | 8000 | 8000 | FastAPI application |
| Frontend | 80 | 3000 | Nginx serving React app |

## 🏗️ Advanced Setup (with Nginx Reverse Proxy)

For production-like deployments with SSL termination and load balancing:

```bash
# Start with nginx profile
docker-compose -f docker-compose/docker-compose.preprod.yml --profile nginx --env-file docker-compose/.env.preprod up -d
```

**Note**: Requires nginx configuration files in `./nginx/` directory.

## 🗄️ Database Management

### Access Database

```bash
# Connect to PostgreSQL
docker-compose -f docker-compose/docker-compose.preprod.basic.yml exec db psql -U postgres -d pienosmart

# Or use external tools
psql -h localhost -p 5432 -U postgres -d pienosmart
```

### Database Backup

```bash
# Backup
docker-compose -f docker-compose/docker-compose.preprod.basic.yml exec -T db pg_dump -U postgres pienosmart > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker-compose -f docker-compose/docker-compose.preprod.basic.yml exec -T db psql -U postgres pienosmart < backup.sql
```

## 🔍 Troubleshooting

### Check Service Health

```bash
# View all service logs
docker-compose -f docker-compose/docker-compose.preprod.basic.yml logs

# Check specific service
docker-compose -f docker-compose/docker-compose.preprod.basic.yml logs backend

# View resource usage
docker-compose -f docker-compose/docker-compose.preprod.basic.yml ps
```

### Common Issues

1. **Database connection fails**
   ```bash
   # Check database health
   docker-compose -f docker-compose/docker-compose.preprod.basic.yml exec db pg_isready -U postgres -d pienosmart
   ```

2. **Backend can't connect to database**
   - Verify `DB_PASSWORD` environment variable
   - Check database service is healthy: `docker-compose ps`

3. **Frontend can't load**
   - Verify `FRONTEND_API_BASE_URL` points to correct backend URL
   - Check backend service is responding: `curl http://localhost:8000/api`

4. **Port conflicts**
   - Change external ports in docker-compose file if needed
   - Example: Change frontend port from `3000:80` to `3001:80`

### Reset Environment

```bash
# Stop and remove all services
docker-compose -f docker-compose/docker-compose.preprod.basic.yml down -v

# Remove images (optional)
docker-compose -f docker-compose/docker-compose.preprod.basic.yml down --rmi all

# Clean up volumes
docker volume rm pienosmart_pienosmart_preprod_pgdata
```

## 🔄 Updating Images

When new images are available from CI/CD:

```bash
# Pull latest images
docker-compose -f docker-compose/docker-compose.preprod.basic.yml pull

# Restart services
docker-compose -f docker-compose/docker-compose.preprod.basic.yml up -d

# Or restart specific service
docker-compose -f docker-compose/docker-compose.preprod.basic.yml up -d backend
```

## 📊 Monitoring

### Health Checks

All services include health checks that run automatically:

- **Database**: PostgreSQL connectivity check
- **Backend**: API endpoint availability
- **Frontend**: Web server response

### Logs

```bash
# Follow all logs
docker-compose -f docker-compose/docker-compose.preprod.basic.yml logs -f

# Follow specific service logs
docker-compose -f docker-compose/docker-compose.preprod.basic.yml logs -f backend

# Get last 100 lines
docker-compose -f docker-compose/docker-compose.preprod.basic.yml logs --tail=100
```

## 🔒 Security Considerations

### For Production Use

1. **Change default passwords** in `.env.preprod`
2. **Use secrets management** instead of environment variables
3. **Enable SSL/TLS** with nginx reverse proxy
4. **Configure proper CORS** origins
5. **Remove development user** settings
6. **Use external database** for data persistence
7. **Implement proper logging** and monitoring

### Environment Isolation

- Use separate `.env` files for different environments
- Never commit secrets to version control
- Use Docker secrets for sensitive data in production

## 📞 Support

For issues with these configurations:

1. Check the [CI/CD Setup Guide](../docs/CI-CD-SETUP.md)
2. Review [CI/CD Checklist](../CICD-CHECKLIST.md)
3. Check individual service documentation:
   - [Backend](../backend/README.md)
   - [Frontend](../frontend/README.md)
   - [Database](../database/README.md)

## 🎯 Next Steps

After setting up pre-production:

1. **Load testing** with realistic data
2. **Integration testing** with external APIs
3. **Performance monitoring** setup
4. **Backup strategy** implementation
5. **Production deployment** preparation