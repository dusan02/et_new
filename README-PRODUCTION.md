# 🚀 Production Deployment Guide

## 📋 Pre-deployment Checklist

### ✅ **Required API Keys**

- [ ] **Finnhub API Key** - Get from [finnhub.io](https://finnhub.io)
- [ ] **Polygon API Key** - Get from [polygon.io](https://polygon.io)

### ✅ **VPS Requirements**

- **OS:** Debian 11+ or Ubuntu 20.04+
- **RAM:** Minimum 2GB (4GB recommended)
- **Storage:** Minimum 20GB SSD
- **CPU:** 2 cores minimum

---

## 🐳 **Docker Deployment (Recommended)**

### **1. Prepare Your VPS**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply docker group changes
```

### **2. Deploy Application**

```bash
# Clone or upload your project
git clone <your-repo> /opt/earnings-table
cd /opt/earnings-table

# Copy and edit environment file
cp .env.example .env
nano .env  # Add your API keys

# Deploy with Docker Compose
docker-compose up -d
```

### **3. Verify Deployment**

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
docker-compose logs -f cron-worker

# Test health check
curl http://localhost:3000/api/health
```

---

## 🔧 **Manual Deployment (Alternative)**

### **1. Install Dependencies**

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server
```

### **2. Setup Database**

```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE earnings_table;
CREATE USER earnings_user WITH PASSWORD 'earnings_password';
GRANT ALL PRIVILEGES ON DATABASE earnings_table TO earnings_user;
\q
```

### **3. Deploy Application**

```bash
# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:push

# Build application
npm run build

# Start services
npm start &
node src/workers/production-cron.js &
```

---

## 📊 **Monitoring & Maintenance**

### **Health Checks**

```bash
# Check application health
curl http://localhost:3000/api/health

# Check database
psql -h localhost -U earnings_user -d earnings_table -c "SELECT COUNT(*) FROM \"EarningsTickersToday\";"

# Check cron worker
docker-compose logs cron-worker | tail -20
```

### **Logs**

```bash
# Application logs
docker-compose logs -f app

# Cron worker logs
docker-compose logs -f cron-worker

# Database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### **Updates**

```bash
# Update application
git pull
docker-compose build --no-cache
docker-compose up -d

# Update database schema
npm run db:push
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. API Keys Not Working**

```bash
# Check environment variables
docker-compose exec app env | grep API_KEY

# Test API connectivity
curl "https://finnhub.io/api/v1/calendar/earnings?from=2024-01-01&to=2024-01-01&token=YOUR_KEY"
```

#### **2. Database Connection Issues**

```bash
# Check database status
docker-compose exec postgres pg_isready -U earnings_user

# Check database logs
docker-compose logs postgres
```

#### **3. Cron Worker Not Running**

```bash
# Check cron worker status
docker-compose ps cron-worker

# Restart cron worker
docker-compose restart cron-worker
```

#### **4. Memory Issues**

```bash
# Check memory usage
docker stats

# Restart services
docker-compose restart
```

---

## 🔒 **Security**

### **Firewall Setup**

```bash
# Install UFW
sudo apt install ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw enable
```

### **SSL Certificate (Optional)**

```bash
# Install Certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com
```

---

## 📈 **Performance Optimization**

### **Database Optimization**

```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_earnings_date_ticker ON "EarningsTickersToday" (reportDate, ticker);
CREATE INDEX CONCURRENTLY idx_market_date_ticker ON "TodayEarningsMovements" (reportDate, ticker);
```

### **Application Optimization**

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable gzip compression
# Add to next.config.js:
compress: true
```

---

## 🎯 **Production Checklist**

- [ ] API keys configured
- [ ] Database migrated to PostgreSQL
- [ ] Docker containers running
- [ ] Cron worker scheduled
- [ ] Health checks passing
- [ ] Logs being monitored
- [ ] Firewall configured
- [ ] SSL certificate installed (optional)
- [ ] Backup strategy implemented
- [ ] Monitoring alerts configured

---

## 📞 **Support**

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables: `docker-compose exec app env`
3. Test API connectivity manually
4. Check database connectivity: `docker-compose exec postgres pg_isready`

**Your application should be running at:** `http://your-vps-ip:3000`
