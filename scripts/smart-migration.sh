#!/bin/bash

# Smart Migration Script with Retry Logic and Error Handling
# Usage: ./scripts/smart-migration.sh

set -e

# Configuration
SERVER="89.185.250.213"
USER="root"
PROJECT_DIR="/opt/earnings-table"
MAX_RETRIES=3
RETRY_DELAY=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run commands on server with retry
run_remote_with_retry() {
    local command="$1"
    local description="$2"
    local retry_count=0
    
    echo -e "${BLUE}🔄 $description${NC}"
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if ssh $USER@$SERVER "$command"; then
            echo -e "${GREEN}✅ $description completed successfully${NC}"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                echo -e "${YELLOW}⚠️ $description failed, retrying in $RETRY_DELAY seconds... (attempt $retry_count/$MAX_RETRIES)${NC}"
                sleep $RETRY_DELAY
            else
                echo -e "${RED}❌ $description failed after $MAX_RETRIES attempts${NC}"
                return 1
            fi
        fi
    done
}

# Function to check server connectivity
check_connectivity() {
    echo -e "${BLUE}🔍 Checking server connectivity...${NC}"
    
    if ping -c 1 $SERVER > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is reachable${NC}"
    else
        echo -e "${RED}❌ Server is not reachable${NC}"
        exit 1
    fi
    
    if ssh -o ConnectTimeout=10 $USER@$SERVER "echo 'SSH connection successful'" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ SSH connection is working${NC}"
    else
        echo -e "${RED}❌ SSH connection failed${NC}"
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if Docker is installed
    if run_remote_with_retry "docker --version" "Checking Docker installation"; then
        echo -e "${GREEN}✅ Docker is installed${NC}"
    else
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if run_remote_with_retry "docker-compose --version" "Checking Docker Compose installation"; then
        echo -e "${GREEN}✅ Docker Compose is installed${NC}"
    else
        echo -e "${RED}❌ Docker Compose is not installed${NC}"
        exit 1
    fi
    
    # Check if Git is installed
    if run_remote_with_retry "git --version" "Checking Git installation"; then
        echo -e "${GREEN}✅ Git is installed${NC}"
    else
        echo -e "${RED}❌ Git is not installed${NC}"
        exit 1
    fi
}

# Function to clean server
clean_server() {
    echo -e "${BLUE}🧹 Cleaning server...${NC}"
    
    # Stop existing services
    run_remote_with_retry "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml down || true" "Stopping existing services"
    
    # Remove old containers and images
    run_remote_with_retry "docker system prune -f" "Cleaning Docker system"
    
    # Remove old project directory
    run_remote_with_retry "rm -rf $PROJECT_DIR || true" "Removing old project directory"
    
    # Create fresh project directory
    run_remote_with_retry "mkdir -p $PROJECT_DIR" "Creating fresh project directory"
}

# Function to deploy application
deploy_application() {
    echo -e "${BLUE}🚀 Deploying application...${NC}"
    
    # Clone repository
    run_remote_with_retry "cd $PROJECT_DIR && git clone https://github.com/dusan02/et_new.git ." "Cloning repository"
    
    # Set up production schema
    run_remote_with_retry "cd $PROJECT_DIR && cp prisma/schema.prod.prisma prisma/schema.prisma" "Setting up production schema"
    
    # Set up environment variables
    run_remote_with_retry "cd $PROJECT_DIR && cp production.env .env" "Setting up environment variables"
    
    # Create database tables
    run_remote_with_retry "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml up -d postgres" "Starting PostgreSQL"
    
    # Wait for database to be ready
    echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
    sleep 30
    
    # Create tables
    run_remote_with_retry "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml exec -T postgres psql -U earnings_user -d earnings_table -c \"
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
    \"" "Creating database tables"
    
    # Build and start application
    run_remote_with_retry "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml up -d --build" "Building and starting application"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${BLUE}🔍 Verifying deployment...${NC}"
    
    # Wait for services to start
    echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
    sleep 60
    
    # Check if services are running
    if run_remote_with_retry "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml ps | grep -q 'Up'" "Checking service status"; then
        echo -e "${GREEN}✅ Services are running${NC}"
    else
        echo -e "${RED}❌ Services are not running${NC}"
        exit 1
    fi
    
    # Test API endpoints
    if run_remote_with_retry "curl -f http://localhost:3000/api/earnings" "Testing API endpoint"; then
        echo -e "${GREEN}✅ API endpoint is working${NC}"
    else
        echo -e "${RED}❌ API endpoint is not working${NC}"
        exit 1
    fi
}

# Function to show final status
show_final_status() {
    echo -e "${GREEN}🎉 Migration completed successfully!${NC}"
    echo -e "${BLUE}📊 Final Status:${NC}"
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
}

# Main migration function
main() {
    echo -e "${BLUE}🚀 Starting Smart Migration${NC}"
    echo -e "${BLUE}================================${NC}"
    
    # Check connectivity
    check_connectivity
    
    # Check prerequisites
    check_prerequisites
    
    # Clean server
    clean_server
    
    # Deploy application
    deploy_application
    
    # Verify deployment
    verify_deployment
    
    # Show final status
    show_final_status
}

# Run main function
main "$@"
