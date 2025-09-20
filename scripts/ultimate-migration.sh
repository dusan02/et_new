#!/bin/bash

# Ultimate Migration Script with All Enhancements
# Usage: ./scripts/ultimate-migration.sh

set -e

# Configuration
SERVER="89.185.250.213"
USER="root"
PROJECT_DIR="/opt/earnings-table"
BACKUP_DIR="/opt/backups/earnings-table"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to run commands on server
run_remote() {
    ssh $USER@$SERVER "$1"
}

# Function to log with timestamp and color
log() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] $message${NC}"
}

# Function to create backup before migration
create_backup() {
    log $BLUE "📦 Creating backup before migration..."
    
    local backup_name="pre-migration-$(date +%Y%m%d-%H%M%S)"
    
    # Create backup directory
    run_remote "mkdir -p $BACKUP_DIR"
    
    # Backup existing project if it exists
    if run_remote "test -d $PROJECT_DIR"; then
        log $YELLOW "⚠️ Existing project found, creating backup..."
        
        # Backup database
        if run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml ps postgres | grep -q 'Up'"; then
            run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml exec -T postgres pg_dump -U earnings_user earnings_table > $BACKUP_DIR/$backup_name-database.sql"
            log $GREEN "✅ Database backed up"
        fi
        
        # Backup application files
        run_remote "tar -czf $BACKUP_DIR/$backup_name-app.tar.gz -C $PROJECT_DIR ."
        log $GREEN "✅ Application files backed up"
        
        # Backup environment variables
        if run_remote "test -f $PROJECT_DIR/.env"; then
            run_remote "cp $PROJECT_DIR/.env $BACKUP_DIR/$backup_name-env"
            log $GREEN "✅ Environment variables backed up"
        fi
    else
        log $YELLOW "ℹ️ No existing project found, skipping backup"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log $BLUE "🔍 Checking prerequisites..."
    
    # Check server connectivity
    if ping -c 1 $SERVER > /dev/null 2>&1; then
        log $GREEN "✅ Server is reachable"
    else
        log $RED "❌ Server is not reachable"
        exit 1
    fi
    
    # Check SSH connection
    if ssh -o ConnectTimeout=10 $USER@$SERVER "echo 'SSH connection successful'" > /dev/null 2>&1; then
        log $GREEN "✅ SSH connection is working"
    else
        log $RED "❌ SSH connection failed"
        exit 1
    fi
    
    # Check Docker installation
    if run_remote "docker --version" > /dev/null 2>&1; then
        log $GREEN "✅ Docker is installed"
    else
        log $RED "❌ Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose installation
    if run_remote "docker-compose --version" > /dev/null 2>&1; then
        log $GREEN "✅ Docker Compose is installed"
    else
        log $RED "❌ Docker Compose is not installed"
        exit 1
    fi
}

# Function to clean server
clean_server() {
    log $BLUE "🧹 Cleaning server..."
    
    # Stop existing services
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml down || true"
    
    # Remove old containers and images
    run_remote "docker system prune -f"
    
    # Remove old project directory
    run_remote "rm -rf $PROJECT_DIR || true"
    
    # Create fresh project directory
    run_remote "mkdir -p $PROJECT_DIR"
    
    log $GREEN "✅ Server cleaned successfully"
}

# Function to deploy application
deploy_application() {
    log $BLUE "🚀 Deploying application..."
    
    # Clone repository
    run_remote "cd $PROJECT_DIR && git clone https://github.com/dusan02/et_new.git ."
    log $GREEN "✅ Repository cloned"
    
    # Set up production schema
    run_remote "cd $PROJECT_DIR && cp prisma/schema.prod.prisma prisma/schema.prisma"
    log $GREEN "✅ Production schema set up"
    
    # Set up environment variables
    run_remote "cd $PROJECT_DIR && cp production.env .env"
    log $GREEN "✅ Environment variables set up"
    
    # Start PostgreSQL
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml up -d postgres"
    log $GREEN "✅ PostgreSQL started"
    
    # Wait for database to be ready
    log $YELLOW "⏳ Waiting for database to be ready..."
    sleep 30
    
    # Create database tables
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml exec -T postgres psql -U earnings_user -d earnings_table -c \"
    CREATE TABLE IF NOT EXISTS \\\"EarningsTickersToday\\\" (
        id SERIAL PRIMARY KEY,
        ticker TEXT NOT NULL,
        company_name TEXT,
        for_date DATE NOT NULL DEFAULT CURRENT_DATE,
        report_time TEXT,
        eps_est DECIMAL(12,2),
        eps_rep DECIMAL(12,2),
        rev_est BIGINT,
        rev_rep BIGINT,
        logo_url TEXT,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS \\\"TodayEarningsMovements\\\" (
        id SERIAL PRIMARY KEY,
        ticker TEXT NOT NULL,
        for_date DATE NOT NULL DEFAULT CURRENT_DATE,
        pre_pct DECIMAL(8,2),
        reg_pct DECIMAL(8,2),
        post_pct DECIMAL(8,2),
        market_cap_diff BIGINT,
        price_close_prev DECIMAL(14,4),
        price_open DECIMAL(14,4),
        price_current DECIMAL(14,4),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS \\\"Earnings\\\" (
        id SERIAL PRIMARY KEY,
        ticker TEXT NOT NULL,
        fiscal_date DATE NOT NULL,
        fiscal_quarter TEXT,
        eps_est DECIMAL(12,2),
        eps_act DECIMAL(12,2),
        rev_est BIGINT,
        rev_act BIGINT,
        guide_eps_lo DECIMAL(12,2),
        guide_eps_hi DECIMAL(12,2),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS \\\"MarketData\\\" (
        id BIGSERIAL PRIMARY KEY,
        ticker TEXT NOT NULL,
        ts TIMESTAMP WITH TIME ZONE NOT NULL,
        price DECIMAL(14,4),
        shares_outstanding BIGINT,
        market_cap BIGINT,
        source TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE UNIQUE INDEX IF NOT EXISTS \\\"EarningsTickersToday_ticker_for_date_key\\\" ON \\\"EarningsTickersToday\\\" (ticker, for_date);
    CREATE INDEX IF NOT EXISTS \\\"idx_ett_ticker\\\" ON \\\"EarningsTickersToday\\\" (ticker);
    
    CREATE UNIQUE INDEX IF NOT EXISTS \\\"TodayEarningsMovements_ticker_for_date_key\\\" ON \\\"TodayEarningsMovements\\\" (ticker, for_date);
    CREATE INDEX IF NOT EXISTS \\\"idx_tem_ticker\\\" ON \\\"TodayEarningsMovements\\\" (ticker);
    
    CREATE UNIQUE INDEX IF NOT EXISTS \\\"Earnings_ticker_fiscal_date_key\\\" ON \\\"Earnings\\\" (ticker, fiscal_date);
    CREATE INDEX IF NOT EXISTS \\\"idx_earnings_ticker_fiscal_date\\\" ON \\\"Earnings\\\" (ticker, fiscal_date);
    
    CREATE INDEX IF NOT EXISTS \\\"idx_marketdata_ticker_ts\\\" ON \\\"MarketData\\\" (ticker, ts);
    \""
    log $GREEN "✅ Database tables created"
    
    # Build and start application
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml up -d --build"
    log $GREEN "✅ Application built and started"
}

# Function to setup monitoring
setup_monitoring() {
    log $BLUE "📊 Setting up monitoring..."
    
    # Copy monitoring scripts
    run_remote "mkdir -p $PROJECT_DIR/monitoring"
    
    # Create monitoring script
    run_remote "cat > $PROJECT_DIR/monitoring/monitor.sh << 'EOF'
#!/bin/bash
LOG_FILE=\"$PROJECT_DIR/monitoring/monitor.log\"

log() {
    echo \"\$(date '+%Y-%m-%d %H:%M:%S') - \$1\" >> \"\$LOG_FILE\"
}

check_service() {
    local service_name=\$1
    local container_name=\$2
    
    if docker ps | grep -q \"\$container_name\"; then
        log \"✅ \$service_name is running\"
        return 0
    else
        log \"❌ \$service_name is not running\"
        return 1
    fi
}

main() {
    log \"🔍 Starting health check...\"
    
    check_service \"PostgreSQL\" \"earnings-postgres\"
    check_service \"Redis\" \"earnings-redis\"
    check_service \"Application\" \"earnings-app\"
    check_service \"Cron Worker\" \"earnings-cron\"
    
    log \"🔍 Health check completed\"
}

main
EOF"
    
    # Make monitoring script executable
    run_remote "chmod +x $PROJECT_DIR/monitoring/monitor.sh"
    
    # Create cron job for monitoring
    run_remote "cat > $PROJECT_DIR/monitoring/monitor.cron << 'EOF'
# Monitor application every 5 minutes
*/5 * * * * $PROJECT_DIR/monitoring/monitor.sh
EOF"
    
    # Install cron job
    run_remote "crontab $PROJECT_DIR/monitoring/monitor.cron"
    
    log $GREEN "✅ Monitoring setup completed"
}

# Function to run post-migration tests
run_tests() {
    log $BLUE "🧪 Running post-migration tests..."
    
    # Wait for services to start
    log $YELLOW "⏳ Waiting for services to start..."
    sleep 60
    
    # Test API endpoints
    local api_status=$(run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/earnings")
    if [ "$api_status" = "200" ]; then
        log $GREEN "✅ API endpoint test: PASSED"
    else
        log $RED "❌ API endpoint test: FAILED"
        return 1
    fi
    
    # Test database connectivity
    if run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml exec -T postgres psql -U earnings_user -d earnings_table -c 'SELECT 1;'" > /dev/null 2>&1; then
        log $GREEN "✅ Database connectivity test: PASSED"
    else
        log $RED "❌ Database connectivity test: FAILED"
        return 1
    fi
    
    # Test external accessibility
    local external_status=$(curl -s -o /dev/null -w '%{http_code}' http://$SERVER:3000)
    if [ "$external_status" = "200" ]; then
        log $GREEN "✅ External accessibility test: PASSED"
    else
        log $RED "❌ External accessibility test: FAILED"
        return 1
    fi
    
    log $GREEN "✅ All tests passed"
}

# Function to show final status
show_final_status() {
    log $GREEN "🎉 Ultimate Migration completed successfully!"
    echo ""
    echo -e "${CYAN}📊 Final Status:${NC}"
    echo -e "   🌐 Application: http://$SERVER:3000"
    echo -e "   📊 API: http://$SERVER:3000/api/earnings"
    echo -e "   📈 Stats: http://$SERVER:3000/api/earnings/stats"
    echo ""
    echo -e "${YELLOW}⚠️ Next steps:${NC}"
    echo -e "   1. Configure API keys in .env file"
    echo -e "   2. Restart services if needed"
    echo -e "   3. Monitor application logs"
    echo ""
    echo -e "${BLUE}🔧 Useful commands:${NC}"
    echo -e "   ssh $USER@$SERVER"
    echo -e "   cd $PROJECT_DIR"
    echo -e "   docker-compose -f deployment/docker-compose.yml logs -f"
    echo ""
    echo -e "${PURPLE}📊 Monitoring:${NC}"
    echo -e "   Health checks: Every 5 minutes"
    echo -e "   Logs: $PROJECT_DIR/monitoring/monitor.log"
    echo -e "   Backup: $BACKUP_DIR"
    echo ""
    echo -e "${GREEN}✅ Migration completed successfully!${NC}"
}

# Main migration function
main() {
    echo -e "${PURPLE}🚀 Starting Ultimate Migration${NC}"
    echo -e "${PURPLE}================================${NC}"
    
    # Step 1: Create backup
    create_backup
    
    # Step 2: Check prerequisites
    check_prerequisites
    
    # Step 3: Clean server
    clean_server
    
    # Step 4: Deploy application
    deploy_application
    
    # Step 5: Setup monitoring
    setup_monitoring
    
    # Step 6: Run tests
    run_tests
    
    # Step 7: Show final status
    show_final_status
}

# Run main function
main "$@"
