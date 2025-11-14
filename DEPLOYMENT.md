# MindCheck Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL 14+ (if not using Docker)
- Redis 6+ (if not using Docker)
- Node.js 18+ (for local development)
- SSL certificates for production deployment

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/mindcheck.git
   cd mindcheck
   ```

2. **Set up environment variables**
   ```bash
   # Copy example environment files
   cp backend/.env.example backend/.env
   cp dashboard/.env.example dashboard/.env
   
   # Edit the .env files with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Initialize the database**
   ```bash
   docker-compose exec backend npm run migrate
   ```

5. **Access the applications**
   - Backend API: http://localhost:3000
   - Admin Dashboard: http://localhost:3001
   - API Documentation: http://localhost:3000/api/docs

## Production Deployment

### 1. Server Requirements

- **Minimum**: 2 vCPUs, 4GB RAM, 20GB storage
- **Recommended**: 4 vCPUs, 8GB RAM, 50GB storage
- **OS**: Ubuntu 20.04 LTS or later

### 2. Security Setup

#### SSL Certificates
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com -d api.your-domain.com
```

#### Firewall Configuration
```bash
# Allow necessary ports
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

### 3. Environment Configuration

Create production environment files:

```bash
# backend/.env.production
NODE_ENV=production
PORT=3000

# Database (use strong passwords)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=mindcheck_prod
DB_USER=mindcheck_user
DB_PASSWORD=<strong-password>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-redis-password>

# Security (generate secure keys)
JWT_SECRET=<generate-with-openssl-rand-base64-32>
ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>

# Email (production SMTP)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=<sendgrid-api-key>
EMAIL_FROM=noreply@your-domain.com

# URLs
WEB_APP_URL=https://admin.your-domain.com
MOBILE_APP_URL=mindcheck://
```

### 4. Docker Production Deployment

```bash
# Build and start with production profile
docker-compose --profile production up -d

# View logs
docker-compose logs -f

# Scale backend if needed
docker-compose up -d --scale backend=3
```

### 5. Database Backup

Set up automated backups:

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="mindcheck_prod"

# Create backup
docker-compose exec -T postgres pg_dump -U postgres $DB_NAME | gzip > "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Keep only last 30 days of backups
find $BACKUP_DIR -type f -name "backup_*.sql.gz" -mtime +30 -delete
EOF

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### 6. Monitoring Setup

#### Health Checks
- Backend: `GET /health`
- Dashboard: `GET /`

#### Recommended Monitoring Tools
- **Uptime**: UptimeRobot, Pingdom
- **APM**: New Relic, DataDog
- **Logs**: ELK Stack, Papertrail
- **Errors**: Sentry

### 7. HIPAA Compliance Checklist

- [ ] SSL/TLS encryption enabled
- [ ] Database encryption at rest configured
- [ ] Audit logging enabled
- [ ] Access controls implemented
- [ ] Backup encryption enabled
- [ ] Business Associate Agreements (BAAs) signed
- [ ] Security training completed
- [ ] Incident response plan documented
- [ ] Regular security audits scheduled

## Cloud Platform Deployment

### AWS Deployment

1. **ECS with Fargate**
   ```bash
   # Build and push images to ECR
   aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI
   docker build -t mindcheck-backend ./backend
   docker tag mindcheck-backend:latest $ECR_URI/mindcheck-backend:latest
   docker push $ECR_URI/mindcheck-backend:latest
   ```

2. **RDS PostgreSQL**
   - Engine: PostgreSQL 14
   - Instance: db.t3.medium
   - Storage: 100GB encrypted
   - Multi-AZ: Yes

3. **ElastiCache Redis**
   - Engine: Redis 7
   - Node type: cache.t3.micro
   - Encryption: In-transit and at-rest

### Google Cloud Platform

1. **Cloud Run**
   ```bash
   # Deploy backend
   gcloud run deploy mindcheck-backend \
     --image gcr.io/$PROJECT_ID/mindcheck-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

2. **Cloud SQL PostgreSQL**
3. **Memorystore Redis**

### Azure Deployment

1. **Container Instances or AKS**
2. **Azure Database for PostgreSQL**
3. **Azure Cache for Redis**

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running: `docker-compose ps`
   - Verify credentials in .env
   - Check firewall rules

2. **Redis Connection Failed**
   - Verify Redis password
   - Check Redis is running: `docker-compose exec redis redis-cli ping`

3. **Email Not Sending**
   - Verify SMTP credentials
   - Check firewall allows outbound SMTP
   - Review email logs: `docker-compose logs backend | grep email`

### Logs and Debugging

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f backend

# Access backend container
docker-compose exec backend sh
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (nginx, AWS ALB)
- Scale backend instances
- Use read replicas for database
- Implement Redis Cluster

### Performance Optimization
- Enable query caching
- Optimize database indexes
- Use CDN for static assets
- Implement rate limiting

## Maintenance

### Regular Tasks
- Weekly: Review logs and alerts
- Monthly: Update dependencies
- Quarterly: Security audit
- Yearly: Disaster recovery test

### Update Process
```bash
# Backup database first
./backup.sh

# Pull latest changes
git pull origin main

# Rebuild and deploy
docker-compose build
docker-compose up -d

# Run migrations
docker-compose exec backend npm run migrate
```

## Support

For deployment support:
- Documentation: [mindcheck.docs.com](https://mindcheck.docs.com)
- Email: support@mindcheck.com
- Enterprise Support: enterprise@mindcheck.com
