# 🔍 SSH Commands Cheat Sheet - Earnings Table App

## 🚀 **QUICK START**

```bash
# Pripojenie na server
ssh root@89.185.250.213

# Navigácia do aplikácie
cd /var/www/earnings-table
```

---

## ⚡ **ESSENTIAL COMMANDS (Najdôležitejšie)**

### 1. **PM2 Status Check**

```bash
pm2 status
pm2 list
pm2 monit
```

### 2. **Health Check**

```bash
curl -f http://localhost:3000/api/monitoring/health
```

### 3. **Recent Logs**

```bash
pm2 logs --lines 10
pm2 logs earnings-table --lines 20
pm2 logs earnings-cron --lines 20
```

### 4. **System Resources**

```bash
free -h
df -h
uptime
htop
```

---

## 🔧 **DETAILED MONITORING**

### **PM2 Process Management**

```bash
# Status všetkých procesov
pm2 status

# Detailný monitoring
pm2 monit

# Logy v reálnom čase
pm2 logs --follow

# Restart procesov
pm2 restart all
pm2 restart earnings-table
pm2 restart earnings-cron

# Stop/Start
pm2 stop all
pm2 start ecosystem.config.js
```

### **Application Health**

```bash
# Health endpoint
curl -f http://localhost:3000/api/monitoring/health

# API endpoints
curl -s http://localhost:3000/api/earnings | head -c 200
curl -s http://localhost:3000/api/earnings/stats | head -c 200

# Production URLs
curl -I https://earningstable.com
curl -I http://89.185.250.213:3000
```

### **Network & Ports**

```bash
# Port 3000 check
netstat -tlnp | grep :3000
ss -tlnp | grep :3000

# Nginx status
systemctl status nginx
nginx -t
```

### **Database Check**

```bash
# Database file
ls -la prisma/
ls -la prisma/dev.db
du -h prisma/dev.db
```

---

## 🚨 **TROUBLESHOOTING**

### **If App is Down**

```bash
# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs --err --lines 50

# Restart everything
pm2 restart all

# Check if port is listening
netstat -tlnp | grep :3000
```

### **If Cron Jobs Not Working**

```bash
# Check cron worker
pm2 logs earnings-cron --lines 50

# Check if worker is running
ps aux | grep worker-new.js

# Restart cron worker
pm2 restart earnings-cron
```

### **If Web App Not Accessible**

```bash
# Check nginx
systemctl status nginx
journalctl -u nginx -n 20

# Check if app is listening
curl -v http://localhost:3000/api/monitoring/health

# Restart app
pm2 restart earnings-table
```

---

## 📊 **ONE-LINER CHECKS**

```bash
# Complete status check
pm2 status && curl -f http://localhost:3000/api/monitoring/health && echo '✅ App OK' || echo '❌ App DOWN'

# Resource check
free -h && df -h / && uptime

# Quick log check
pm2 logs --lines 10

# Port check
netstat -tlnp | grep :3000 && echo '✅ Port 3000 OK' || echo '❌ Port 3000 DOWN'
```

---

## 🎯 **SUCCESS INDICATORS**

### ✅ **Everything OK:**

- `pm2 status` shows both processes **online**
- `curl -f http://localhost:3000/api/monitoring/health` returns **HTTP 200**
- `https://earningstable.com` accessible
- No error logs in PM2
- Cron jobs executing (check logs)

### ❌ **Something Wrong:**

- PM2 processes **stopped/errored**
- Health check returns **HTTP error**
- Website not accessible
- Error logs in PM2
- Port 3000 not listening

---

## 🔄 **EMERGENCY COMMANDS**

```bash
# Nuclear option - restart everything
pm2 stop all
pm2 delete all
pm2 start ecosystem.config.js
pm2 save

# Check what's using port 3000
lsof -i :3000

# Kill process on port 3000
fuser -k 3000/tcp

# Check system logs
journalctl -f
dmesg | tail
```

---

## 📱 **MONITORING DASHBOARD**

```bash
# Real-time monitoring
pm2 monit

# Live logs
pm2 logs --follow

# System resources
htop

# Network connections
netstat -tulpn
```

---

## 🚀 **DEPLOYMENT VERIFICATION**

```bash
# Check git status
git status
git log --oneline -5

# Check environment
cat .env.local

# Check package versions
npm list --depth=0

# Check build
ls -la .next/
```

---

**💡 Tip:** Uložte si tieto príkazy do `.bashrc` alebo vytvorte aliasy pre rýchlejší prístup!

```bash
# Add to ~/.bashrc
alias appstatus='pm2 status && curl -f http://localhost:3000/api/monitoring/health'
alias applogs='pm2 logs --lines 20'
alias apprestart='pm2 restart all'
```
