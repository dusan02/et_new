# 🚀 Production Deployment Guide

## Server Information
- **IP Address**: 89.185.250.213
- **Domain**: earningstable.com
- **Port**: 3000
- **Application**: Live Earnings Table

## 📋 Pre-Deployment Checklist

### 1. Server Requirements
- [ ] Ubuntu/CentOS server with root access
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database configured
- [ ] Nginx installed and configured
- [ ] PM2 installed globally
- [ ] SSL certificate (Let's Encrypt)

### 2. Environment Setup
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install Nginx
sudo apt-get install nginx
```

### 3. Application Deployment

#### Step 1: Clone and Setup
```bash
git clone https://github.com/dusan02/et_new.git
cd et_new
npm ci --production
```

#### Step 2: Environment Configuration
```bash
# Copy and edit production environment
cp env.production.example .env.production
nano .env.production
```

#### Step 3: Build and Deploy
```bash
# Make deployment script executable
chmod +x deploy-production.sh

# Run deployment
./deploy-production.sh
```

### 4. Nginx Configuration

#### Copy Nginx Config
```bash
sudo cp nginx-production.conf /etc/nginx/sites-available/earningstable
sudo ln -s /etc/nginx/sites-available/earningstable /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### SSL Certificate
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d earningstable.com -d www.earningstable.com
```

### 5. PM2 Process Management

#### Start Application
```bash
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save
```

#### Monitor Application
```bash
# Check status
pm2 status

# View logs
pm2 logs earningstable

# Monitor resources
./monitor-production.sh
```

## 🔧 Maintenance Commands

### Application Management
```bash
# Restart application
pm2 restart earningstable

# Stop application
pm2 stop earningstable

# Update application
git pull origin main
npm ci --production
npm run build
pm2 restart earningstable
```

### Data Management
```bash
# Fetch fresh data
npm run fetch

# Clear cache
curl -X POST http://localhost:3000/api/earnings/clear-cache

# Run cron jobs
npm run cron
```

### Monitoring
```bash
# Health check
curl http://localhost:3000/api/monitoring/health

# Application status
./monitor-production.sh

# Backup data
./backup-production.sh
```

## 📊 Monitoring Endpoints

- **Health Check**: http://89.185.250.213:3000/api/monitoring/health
- **Metrics**: http://89.185.250.213:3000/api/monitoring/metrics
- **Data Quality**: http://89.185.250.213:3000/api/data-quality

## 🔒 Security Considerations

1. **Firewall**: Configure UFW to allow only necessary ports
2. **SSL**: Ensure HTTPS is properly configured
3. **Rate Limiting**: Nginx rate limiting is configured
4. **Environment Variables**: Keep API keys secure
5. **Regular Updates**: Keep system and dependencies updated

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check PM2 logs
pm2 logs earningstable

# Check system resources
./monitor-production.sh

# Restart application
pm2 restart earningstable
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U username -d earnings_table_prod
```

#### Nginx Issues
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

## 📈 Performance Optimization

1. **Caching**: Redis caching is configured
2. **Compression**: Gzip compression enabled
3. **CDN**: Consider CloudFlare for static assets
4. **Database**: Optimize queries and add indexes
5. **Monitoring**: Set up alerts for critical metrics

## 🔄 Backup Strategy

- **Daily Backups**: Automated via cron job
- **Database Backups**: PostgreSQL dumps
- **Application Backups**: Source code and configuration
- **Retention**: 7 days of backups

## 📞 Support

For production issues:
1. Check application logs: `pm2 logs earningstable`
2. Monitor system resources: `./monitor-production.sh`
3. Verify API endpoints are responding
4. Check database connectivity
5. Review Nginx access/error logs

---

**Last Updated**: $(date)
**Version**: Latest from main branch
**Status**: Production Ready ✅
