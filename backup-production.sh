#!/bin/bash

# Production Backup Script for earningstable.com

echo "💾 Starting production backup..."

# Configuration
BACKUP_DIR="/backups/earningstable"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="earningstable_backup_$DATE"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📁 Creating backup: $BACKUP_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup application files
echo "📦 Backing up application files..."
tar -czf "$BACKUP_DIR/$BACKUP_NAME/app.tar.gz" \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=.git \
    --exclude=logs \
    --exclude=backups \
    .

# Backup database (if using PostgreSQL)
echo "🗄️ Backing up database..."
if command -v pg_dump &> /dev/null; then
    pg_dump earnings_table_prod > "$BACKUP_DIR/$BACKUP_NAME/database.sql"
    print_status "Database backup completed"
else
    print_warning "PostgreSQL not found, skipping database backup"
fi

# Backup environment files
echo "🔐 Backing up environment files..."
cp .env.production "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
cp .env "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true

# Backup PM2 configuration
echo "⚙️ Backing up PM2 configuration..."
pm2 save
cp ~/.pm2/dump.pm2 "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true

# Create backup info file
cat > "$BACKUP_DIR/$BACKUP_NAME/backup_info.txt" << EOF
Backup Date: $(date)
Server: 89.185.250.213
Domain: earningstable.com
Application: Earnings Table
Version: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
EOF

# Compress the entire backup
echo "🗜️ Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

# Clean old backups (keep last 7 days)
echo "🧹 Cleaning old backups..."
find "$BACKUP_DIR" -name "earningstable_backup_*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"

# Show backup size
backup_size=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)
echo "📊 Backup size: $backup_size"
