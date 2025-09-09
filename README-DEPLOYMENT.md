# 🚀 EarningsTable - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Prerequisites

- [ ] Node.js 18+ installed
- [ ] PostgreSQL database server
- [ ] Domain name configured
- [ ] SSL certificates (Let's Encrypt recommended)
- [ ] API keys for Polygon.io and Finnhub

### ✅ Environment Variables

Update `production.env` with your actual values:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/earnings_table_prod"
POLYGON_API_KEY="your_actual_polygon_key"
FINNHUB_API_KEY="your_actual_finnhub_key"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

## 🐳 Option 1: Docker Deployment (Recommended)

### 1. Prepare Environment

```bash
# Copy environment file
cp production.env .env

# Update with your actual values
nano .env
```

### 2. Deploy with Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 3. Database Setup

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma db push

# Seed initial data (optional)
docker-compose -f docker-compose.prod.yml exec app npm run fetch:data
```

## 🖥️ Option 2: Manual Server Deployment

### 1. Run Deployment Script

```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh
./deploy.sh
```

### 2. Upload to Server

```bash
# Copy production folder to server
scp -r production/ user@yourserver:/var/www/earnings-table/
```

### 3. Server Setup

```bash
# SSH to server
ssh user@yourserver

# Install dependencies
cd /var/www/earnings-table/production
npm install --production

# Setup database
npx prisma db push

# Start services
sudo systemctl start earnings-table
sudo systemctl start earnings-cron
```

## 🔧 Configuration

### Database Setup

```sql
-- Create database
CREATE DATABASE earnings_table_prod;

-- Create user
CREATE USER earnings_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE earnings_table_prod TO earnings_user;
```

### Nginx Configuration

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/earnings-table
sudo ln -s /etc/nginx/sites-available/earnings-table /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### SSL Setup (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check application status
curl http://localhost:3000/health

# Check database connection
npx prisma studio

# Check cron logs
journalctl -u earnings-cron -f
```

### Backup Strategy

```bash
# Database backup
pg_dump earnings_table_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
pg_dump earnings_table_prod | gzip > /backups/earnings_$(date +%Y%m%d_%H%M%S).sql.gz
find /backups -name "earnings_*.sql.gz" -mtime +7 -delete
```

### Performance Monitoring

```bash
# Check resource usage
docker stats

# Monitor logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🔄 Updates & Maintenance

### Application Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Or for manual deployment
./deploy.sh
```

### Database Migrations

```bash
# Run migrations
npx prisma db push

# Or in Docker
docker-compose -f docker-compose.prod.yml exec app npx prisma db push
```

## 🚨 Troubleshooting

### Common Issues

**Database Connection Error:**

```bash
# Check database status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U earnings_user -d earnings_table_prod
```

**Application Won't Start:**

```bash
# Check logs
journalctl -u earnings-table -f

# Check environment variables
cat .env.local
```

**Cron Jobs Not Running:**

```bash
# Check cron service
sudo systemctl status earnings-cron

# Check logs
journalctl -u earnings-cron -f
```

**Nginx 502 Error:**

```bash
# Check if app is running
curl http://localhost:3000

# Check nginx config
sudo nginx -t
```

## 📞 Support

- **Documentation:** Check `docs/` folder
- **Logs:** `/var/log/` or `docker logs`
- **Database:** `npx prisma studio`
- **API Testing:** Use Postman or curl

## 🎯 Production Checklist

- [ ] SSL certificate installed and working
- [ ] Database backups configured
- [ ] Monitoring setup
- [ ] Error logging configured
- [ ] Performance optimization enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Cron jobs running
- [ ] API keys secured
- [ ] Domain DNS configured

**🎉 Your EarningsTable is now live in production!**
