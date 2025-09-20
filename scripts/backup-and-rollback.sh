#!/bin/bash

# Backup and Rollback Script for Migration
# Usage: ./scripts/backup-and-rollback.sh [backup|rollback|list]

set -e

# Server details
SERVER="89.185.250.213"
USER="root"
PROJECT_DIR="/opt/earnings-table"
BACKUP_DIR="/opt/backups/earnings-table"

# Function to run commands on server
run_remote() {
    ssh $USER@$SERVER "$1"
}

# Function to create backup
create_backup() {
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    
    echo "📦 Creating backup: $backup_name"
    
    # Create backup directory
    run_remote "mkdir -p $BACKUP_DIR"
    
    # Backup database
    echo "💾 Backing up database..."
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml exec -T postgres pg_dump -U earnings_user earnings_table > $BACKUP_DIR/$backup_name-database.sql"
    
    # Backup application files
    echo "📁 Backing up application files..."
    run_remote "tar -czf $BACKUP_DIR/$backup_name-app.tar.gz -C $PROJECT_DIR ."
    
    # Backup environment variables
    echo "🔐 Backing up environment variables..."
    run_remote "cp $PROJECT_DIR/.env $BACKUP_DIR/$backup_name-env"
    
    # Create backup manifest
    run_remote "cat > $BACKUP_DIR/$backup_name-manifest.txt << EOF
Backup created: $(date)
Server: $SERVER
Project: $PROJECT_DIR
Database: earnings_table
Files: $backup_name-app.tar.gz
Database: $backup_name-database.sql
Environment: $backup_name-env
EOF"
    
    echo "✅ Backup created successfully: $backup_name"
    echo "📁 Backup location: $BACKUP_DIR/$backup_name-*"
}

# Function to list backups
list_backups() {
    echo "📋 Available backups:"
    run_remote "ls -la $BACKUP_DIR/ | grep -E 'backup-[0-9]{8}-[0-9]{6}' | awk '{print \$9}' | sed 's/-.*//' | sort -u"
}

# Function to rollback
rollback() {
    local backup_name=$1
    
    if [ -z "$backup_name" ]; then
        echo "❌ Please specify backup name"
        echo "Usage: $0 rollback <backup-name>"
        list_backups
        exit 1
    fi
    
    echo "🔄 Rolling back to: $backup_name"
    
    # Check if backup exists
    if ! run_remote "test -f $BACKUP_DIR/$backup_name-app.tar.gz"; then
        echo "❌ Backup not found: $backup_name"
        list_backups
        exit 1
    fi
    
    # Stop services
    echo "⏹️ Stopping services..."
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml down"
    
    # Restore application files
    echo "📁 Restoring application files..."
    run_remote "rm -rf $PROJECT_DIR/*"
    run_remote "tar -xzf $BACKUP_DIR/$backup_name-app.tar.gz -C $PROJECT_DIR"
    
    # Restore environment variables
    echo "🔐 Restoring environment variables..."
    run_remote "cp $BACKUP_DIR/$backup_name-env $PROJECT_DIR/.env"
    
    # Restore database
    echo "💾 Restoring database..."
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml up -d postgres"
    run_remote "sleep 10"
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml exec -T postgres psql -U earnings_user -d earnings_table < $BACKUP_DIR/$backup_name-database.sql"
    
    # Start services
    echo "🚀 Starting services..."
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml up -d"
    
    echo "✅ Rollback completed successfully"
}

# Function to cleanup old backups
cleanup_backups() {
    local days_to_keep=${1:-7}
    
    echo "🧹 Cleaning up backups older than $days_to_keep days..."
    run_remote "find $BACKUP_DIR -name 'backup-*' -type f -mtime +$days_to_keep -delete"
    echo "✅ Cleanup completed"
}

# Main script logic
case "${1:-backup}" in
    "backup")
        create_backup
        ;;
    "rollback")
        rollback "$2"
        ;;
    "list")
        list_backups
        ;;
    "cleanup")
        cleanup_backups "$2"
        ;;
    *)
        echo "Usage: $0 [backup|rollback|list|cleanup] [backup-name|days]"
        echo ""
        echo "Commands:"
        echo "  backup              - Create a new backup"
        echo "  rollback <name>     - Rollback to specific backup"
        echo "  list                - List available backups"
        echo "  cleanup [days]      - Cleanup old backups (default: 7 days)"
        exit 1
        ;;
esac
