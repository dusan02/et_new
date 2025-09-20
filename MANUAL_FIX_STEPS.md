# 🔧 Manual Fix Steps for Migration Issues

## Problem

- **Error:** `ERR_CONNECTION_REFUSED` on port 3000
- **Cause:** Docker services not running or port not exposed
- **Server:** 89.185.250.213

## 🔍 Diagnosis Steps

### 1. Connect to Server

```bash
ssh root@89.185.250.213
# Password: EJXTfBOG2t
```

### 2. Check Project Directory

```bash
cd /opt/earnings-table
ls -la
```

### 3. Check Docker Status

```bash
docker ps
docker-compose -f deployment/docker-compose.yml ps
```

### 4. Check Application Logs

```bash
docker-compose -f deployment/docker-compose.yml logs app
docker-compose -f deployment/docker-compose.yml logs postgres
```

## 🔧 Fix Steps

### Option 1: Restart Services

```bash
cd /opt/earnings-table
docker-compose -f deployment/docker-compose.yml down
docker-compose -f deployment/docker-compose.yml up -d --build
```

### Option 2: Check Firewall

```bash
ufw status
ufw allow 3000
```

### Option 3: Full Redeploy

```bash
cd /opt
rm -rf earnings-table
mkdir earnings-table
cd earnings-table
git clone https://github.com/dusan02/et_new.git .
cp prisma/schema.prod.prisma prisma/schema.prisma
cp production.env .env
docker-compose -f deployment/docker-compose.yml up -d --build
```

## 🧪 Test Steps

### 1. Check Local Port

```bash
curl http://localhost:3000
```

### 2. Check External Port

```bash
# From your local machine:
curl http://89.185.250.213:3000
```

### 3. Check API Endpoints

```bash
curl http://89.185.250.213:3000/api/earnings
curl http://89.185.250.213:3000/api/earnings/stats
```

## 📊 Expected Results

After successful fix:

- ✅ Port 3000 accessible
- ✅ Application responds with HTML
- ✅ API endpoints return JSON data
- ✅ No connection refused errors

## 🚨 Common Issues

1. **Docker not running:** `systemctl start docker`
2. **Port blocked:** `ufw allow 3000`
3. **Build failed:** Check logs and rebuild
4. **Database issues:** Check PostgreSQL logs

## 🔧 Quick Commands

```bash
# Quick restart
cd /opt/earnings-table && docker-compose -f deployment/docker-compose.yml restart

# Check status
docker-compose -f deployment/docker-compose.yml ps

# View logs
docker-compose -f deployment/docker-compose.yml logs -f

# Rebuild everything
docker-compose -f deployment/docker-compose.yml down && docker-compose -f deployment/docker-compose.yml up -d --build
```
