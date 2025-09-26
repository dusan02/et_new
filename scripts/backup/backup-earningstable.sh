#!/bin/bash

# Complete Backup Script for EarningsTable (earningstable.com)
# Creates full backup of application, database, and configuration

echo "🔄 Starting EarningsTable Backup"
echo "==============================="
echo "📅 Date: $(date)"
echo "🌐 Domain: earningstable.com"
echo "📍 Server: $(hostname -I | awk '{print $1}')"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Configuration
BACKUP_DIR="/root/backups/earningstable"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="earningstable_backup_$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
APP_DIR="/var/www/earnings-table"
MAX_BACKUPS=7  # Keep last 7 backups

# Create backup directory
print_status "Creating backup directory structure..."
mkdir -p "$BACKUP_PATH"/{app,database,config,logs,ssl}

# 1. Backup Application Code
print_status "Backing up application code..."
if [ -d "$APP_DIR" ]; then
    # Exclude node_modules and .next for smaller backup
    tar --exclude='node_modules' \
        --exclude='.next' \
        --exclude='*.log' \
        --exclude='tmp' \
        -czf "$BACKUP_PATH/app/source_code.tar.gz" \
        -C "$APP_DIR" .
    
    # Backup package files separately for easy restore
    cp "$APP_DIR/package.json" "$BACKUP_PATH/app/"
    cp "$APP_DIR/package-lock.json" "$BACKUP_PATH/app/" 2>/dev/null || true
    cp "$APP_DIR/.env" "$BACKUP_PATH/app/" 2>/dev/null || true
    cp "$APP_DIR/.env.local" "$BACKUP_PATH/app/" 2>/dev/null || true
    
    print_success "Application code backed up"
else
    print_error "Application directory not found: $APP_DIR"
fi

# 2. Backup Database
print_status "Backing up SQLite database..."
if [ -f "$APP_DIR/prisma/dev.db" ]; then
    cp "$APP_DIR/prisma/dev.db" "$BACKUP_PATH/database/"
    cp "$APP_DIR/prisma/schema.prisma" "$BACKUP_PATH/database/"
    
    # Create SQL dump for portability
    if command -v sqlite3 &> /dev/null; then
        sqlite3 "$APP_DIR/prisma/dev.db" .dump > "$BACKUP_PATH/database/dump.sql"
        print_success "Database backed up (binary + SQL dump)"
    else
        print_success "Database backed up (binary only)"
    fi
else
    print_warning "Database file not found: $APP_DIR/prisma/dev.db"
fi

# 3. Backup Nginx Configuration
print_status "Backing up Nginx configuration..."
if [ -f "/etc/nginx/sites-available/earningstable.com" ]; then
    cp "/etc/nginx/sites-available/earningstable.com" "$BACKUP_PATH/config/"
    print_success "Nginx config backed up"
else
    print_warning "Nginx config not found"
fi

# 4. Backup SSL Certificates
print_status "Backing up SSL certificates..."
if [ -d "/etc/letsencrypt/live/earningstable.com" ]; then
    cp -r "/etc/letsencrypt/live/earningstable.com" "$BACKUP_PATH/ssl/"
    cp -r "/etc/letsencrypt/renewal" "$BACKUP_PATH/ssl/" 2>/dev/null || true
    print_success "SSL certificates backed up"
else
    print_warning "SSL certificates not found"
fi

# 5. Backup Application Logs
print_status "Backing up application logs..."
if [ -f "$APP_DIR/cron-final.log" ]; then
    cp "$APP_DIR"/*.log "$BACKUP_PATH/logs/" 2>/dev/null || true
fi
if [ -d "/var/log/nginx" ]; then
    cp "/var/log/nginx/access.log" "$BACKUP_PATH/logs/" 2>/dev/null || true
    cp "/var/log/nginx/error.log" "$BACKUP_PATH/logs/" 2>/dev/null || true
fi
print_success "Logs backed up"

# 6. Create System Info
print_status "Creating system information..."
cat > "$BACKUP_PATH/system_info.txt" << EOF
EarningsTable System Backup Information
=====================================
Backup Date: $(date)
Hostname: $(hostname)
IP Address: $(hostname -I | awk '{print $1}')
OS: $(lsb_release -d 2>/dev/null || echo "Unknown")
Kernel: $(uname -r)
Node.js: $(node --version 2>/dev/null || echo "Not found")
NPM: $(npm --version 2>/dev/null || echo "Not found")
Nginx: $(nginx -v 2>&1 | head -1 || echo "Not found")

Application Status:
==================
$(ps aux | grep -E "(node|nginx)" | grep -v grep)

Disk Usage:
==========
$(df -h)

Network:
========
$(ss -tlnp | grep -E ":80|:443|:3000")

SSL Certificate:
===============
$(openssl x509 -in /etc/letsencrypt/live/earningstable.com/fullchain.pem -text -noout 2>/dev/null | grep -E "(Subject:|Issuer:|Not After)" || echo "SSL info not available")
EOF

# 7. Create restoration instructions
print_status "Creating restoration instructions..."
cat > "$BACKUP_PATH/RESTORE_INSTRUCTIONS.md" << 'EOF'
# EarningsTable Restoration Instructions

## Prerequisites
- Fresh Debian/Ubuntu server
- Root access
- Domain pointing to server IP

## Quick Restore Steps

### 1. Install Dependencies
```bash
apt update && apt install -y nginx nodejs npm sqlite3 certbot python3-certbot-nginx
```

### 2. Restore Application
```bash
# Create application directory
mkdir -p /var/www/earnings-table
cd /var/www/earnings-table

# Extract application code
tar -xzf /path/to/backup/app/source_code.tar.gz

# Copy configuration files
cp /path/to/backup/app/.env .
cp /path/to/backup/app/.env.local .

# Install dependencies
npm ci --production
npx prisma generate
```

### 3. Restore Database
```bash
# Copy database file
cp /path/to/backup/database/dev.db ./prisma/
cp /path/to/backup/database/schema.prisma ./prisma/

# Or restore from SQL dump
sqlite3 ./prisma/dev.db < /path/to/backup/database/dump.sql
```

### 4. Restore Nginx Configuration
```bash
cp /path/to/backup/config/earningstable.com /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/earningstable.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 5. Restore SSL Certificates
```bash
# Copy certificates
cp -r /path/to/backup/ssl/earningstable.com /etc/letsencrypt/live/
cp -r /path/to/backup/ssl/renewal /etc/letsencrypt/

# Or setup new certificates
certbot --nginx -d earningstable.com -d www.earningstable.com
```

### 6. Start Services
```bash
# Start application
cd /var/www/earnings-table
NODE_ENV=production nohup npm start > app.log 2>&1 &

# Start cron worker
nohup node src/queue/worker-new.js > cron.log 2>&1 &

# Enable services
systemctl enable nginx
systemctl start nginx
```

### 7. Verify Restoration
```bash
curl -I https://earningstable.com
curl -s https://earningstable.com/api/earnings/stats
```
EOF

# 8. Compress entire backup
print_status "Compressing backup archive..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"
print_success "Backup compressed: ${BACKUP_NAME}.tar.gz"

# 9. Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
print_success "Backup size: $BACKUP_SIZE"

# 10. Cleanup old backups
print_status "Cleaning up old backups (keeping last $MAX_BACKUPS)..."
cd "$BACKUP_DIR"
ls -t earningstable_backup_*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm
REMAINING_BACKUPS=$(ls earningstable_backup_*.tar.gz 2>/dev/null | wc -l)
print_success "Cleanup complete. Remaining backups: $REMAINING_BACKUPS"

# 11. Create latest symlink
ln -sf "${BACKUP_NAME}.tar.gz" "latest_backup.tar.gz"

# 12. Show backup summary
echo ""
print_success "🎉 Backup completed successfully!"
echo ""
print_status "📋 Backup Summary:"
echo "   📂 Location: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "   📊 Size: $BACKUP_SIZE"
echo "   🕐 Created: $(date)"
echo "   📄 Contents:"
echo "      - Application source code"
echo "      - SQLite database + SQL dump"
echo "      - Nginx configuration"
echo "      - SSL certificates"
echo "      - Application logs"
echo "      - System information"
echo "      - Restoration instructions"
echo ""
print_status "🔗 Quick access: $BACKUP_DIR/latest_backup.tar.gz"
echo ""
print_status "📋 To restore this backup:"
echo "   1. Copy backup file to new server"
echo "   2. Extract: tar -xzf ${BACKUP_NAME}.tar.gz"
echo "   3. Follow RESTORE_INSTRUCTIONS.md"
echo ""
EOF
