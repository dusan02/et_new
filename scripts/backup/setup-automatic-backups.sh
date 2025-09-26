#!/bin/bash

# Setup Automatic Backups for EarningsTable
# Configures daily backups with rotation and monitoring

echo "⚙️ Setting up automatic backups for EarningsTable"
echo "==============================================="
echo "🌐 Domain: earningstable.com"
echo "📅 Date: $(date)"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# 1. Copy backup script to system location
print_status "Installing backup script..."
cp backup-earningstable.sh /usr/local/bin/
chmod +x /usr/local/bin/backup-earningstable.sh
print_success "Backup script installed to /usr/local/bin/"

# 2. Create backup directories
print_status "Creating backup directories..."
mkdir -p /root/backups/earningstable
mkdir -p /var/log/backups
print_success "Backup directories created"

# 3. Setup daily cron job
print_status "Setting up daily cron job..."
CRON_JOB="0 2 * * * /usr/local/bin/backup-earningstable.sh >> /var/log/backups/backup.log 2>&1"

# Add cron job if it doesn't exist
if ! crontab -l 2>/dev/null | grep -q "backup-earningstable.sh"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    print_success "Daily backup cron job added (runs at 2:00 AM)"
else
    print_warning "Backup cron job already exists"
fi

# 4. Create backup monitoring script
print_status "Creating backup monitoring script..."
cat > /usr/local/bin/backup-monitor.sh << 'EOF'
#!/bin/bash

# Backup Monitor for EarningsTable
# Checks backup status and sends alerts if needed

BACKUP_DIR="/root/backups/earningstable"
LOG_FILE="/var/log/backups/monitor.log"
MAX_AGE_HOURS=48  # Alert if no backup in 48 hours

echo "$(date): Checking backup status..." >> "$LOG_FILE"

# Check if latest backup exists and is recent
if [ -f "$BACKUP_DIR/latest_backup.tar.gz" ]; then
    BACKUP_AGE=$(find "$BACKUP_DIR/latest_backup.tar.gz" -mtime +2 2>/dev/null)
    
    if [ -n "$BACKUP_AGE" ]; then
        echo "$(date): WARNING - Latest backup is older than 48 hours!" >> "$LOG_FILE"
        echo "$(date): WARNING - Latest backup is older than 48 hours!"
        exit 1
    else
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/latest_backup.tar.gz" | cut -f1)
        echo "$(date): OK - Latest backup exists ($BACKUP_SIZE)" >> "$LOG_FILE"
        echo "$(date): ✅ Latest backup exists ($BACKUP_SIZE)"
        exit 0
    fi
else
    echo "$(date): ERROR - No backup found!" >> "$LOG_FILE"
    echo "$(date): ❌ No backup found!"
    exit 1
fi
EOF

chmod +x /usr/local/bin/backup-monitor.sh
print_success "Backup monitoring script created"

# 5. Setup weekly backup verification
print_status "Setting up weekly backup verification..."
VERIFY_CRON="0 3 * * 0 /usr/local/bin/backup-monitor.sh"

if ! crontab -l 2>/dev/null | grep -q "backup-monitor.sh"; then
    (crontab -l 2>/dev/null; echo "$VERIFY_CRON") | crontab -
    print_success "Weekly backup verification added (runs Sundays at 3:00 AM)"
else
    print_warning "Backup verification cron job already exists"
fi

# 6. Create backup restore script
print_status "Creating restore script..."
cat > /usr/local/bin/restore-earningstable.sh << 'EOF'
#!/bin/bash

# EarningsTable Restore Script
# Quick restore from backup

BACKUP_FILE="$1"
APP_DIR="/var/www/earnings-table"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    echo "Available backups:"
    ls -la /root/backups/earningstable/*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Starting EarningsTable restoration..."
echo "📂 Backup file: $BACKUP_FILE"
echo "📁 Target: $APP_DIR"
echo ""

# Stop services
echo "⏹️ Stopping services..."
pkill -f "next"
pkill -f "worker-new"
systemctl stop nginx

# Create temporary restore directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Extract backup
echo "📦 Extracting backup..."
tar -xzf "$BACKUP_FILE"

BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)

# Restore application
echo "🔄 Restoring application..."
if [ -d "$APP_DIR" ]; then
    mv "$APP_DIR" "${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
fi

mkdir -p "$APP_DIR"
cd "$APP_DIR"
tar -xzf "$TEMP_DIR/$BACKUP_NAME/app/source_code.tar.gz"

# Restore configuration
cp "$TEMP_DIR/$BACKUP_NAME/app/.env" . 2>/dev/null || true
cp "$TEMP_DIR/$BACKUP_NAME/app/.env.local" . 2>/dev/null || true

# Restore database
echo "🗄️ Restoring database..."
mkdir -p prisma
cp "$TEMP_DIR/$BACKUP_NAME/database/dev.db" prisma/ 2>/dev/null || true
cp "$TEMP_DIR/$BACKUP_NAME/database/schema.prisma" prisma/ 2>/dev/null || true

# Restore Nginx config
echo "🌐 Restoring Nginx configuration..."
cp "$TEMP_DIR/$BACKUP_NAME/config/earningstable.com" /etc/nginx/sites-available/ 2>/dev/null || true

# Install dependencies and start
echo "📦 Installing dependencies..."
npm ci --production
npx prisma generate

# Start services
echo "🚀 Starting services..."
systemctl start nginx
NODE_ENV=production nohup npm start > app.log 2>&1 &
nohup node src/queue/worker-new.js > cron.log 2>&1 &

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Restoration completed!"
echo "🌐 Check: https://earningstable.com"
echo "🔍 Logs: tail -f $APP_DIR/app.log"
EOF

chmod +x /usr/local/bin/restore-earningstable.sh
print_success "Restore script created"

# 7. Create backup management commands
print_status "Creating backup management commands..."
cat > /usr/local/bin/backup-list.sh << 'EOF'
#!/bin/bash
echo "📋 Available EarningsTable backups:"
echo "=================================="
ls -lah /root/backups/earningstable/*.tar.gz 2>/dev/null | while read line; do
    echo "$line"
done
echo ""
echo "💡 Latest backup: $(readlink -f /root/backups/earningstable/latest_backup.tar.gz 2>/dev/null || echo 'None')"
echo "📊 Total backup size: $(du -sh /root/backups/earningstable 2>/dev/null | cut -f1 || echo 'Unknown')"
EOF

chmod +x /usr/local/bin/backup-list.sh
print_success "Backup management commands created"

# 8. Run initial backup
print_status "Running initial backup..."
/usr/local/bin/backup-earningstable.sh

# 9. Show summary
echo ""
print_success "🎉 Automatic backup system configured!"
echo ""
print_status "📋 Backup Schedule:"
echo "   🕐 Daily backups: 2:00 AM (keeps last 7)"
echo "   🔍 Weekly verification: Sunday 3:00 AM"
echo "   📂 Location: /root/backups/earningstable/"
echo ""
print_status "🛠️ Available commands:"
echo "   backup-list.sh                    # List all backups"
echo "   backup-earningstable.sh           # Manual backup"
echo "   backup-monitor.sh                 # Check backup status"
echo "   restore-earningstable.sh <file>   # Restore from backup"
echo ""
print_status "📊 Current cron jobs:"
crontab -l | grep -E "(backup|monitor)" || echo "   No backup cron jobs found"
echo ""
print_status "📋 Log files:"
echo "   /var/log/backups/backup.log      # Backup logs"
echo "   /var/log/backups/monitor.log     # Monitor logs"
echo ""
print_warning "💡 Tips:"
echo "   - Test restore process regularly"
echo "   - Store backups off-site for disaster recovery"
echo "   - Monitor backup logs for any issues"
echo "   - Consider additional backup to cloud storage"
