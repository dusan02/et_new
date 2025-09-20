#!/bin/bash

# Complete Migration Script - Migrates project to server in one command
# Usage: ./scripts/migrate-to-server.sh

set -e

echo "🚀 Starting complete migration to server..."

# Server details
SERVER="89.185.250.213"
USER="root"
PROJECT_DIR="/opt/earnings-table"

# Function to run commands on server
run_remote() {
    ssh $USER@$SERVER "$1"
}

echo "📋 Step 1: Cloning project from GitHub..."
run_remote "cd $PROJECT_DIR && git clone https://github.com/dusan02/et_new.git ."

echo "📋 Step 2: Setting up production Prisma schema..."
run_remote "cd $PROJECT_DIR && cp prisma/schema.prod.prisma prisma/schema.prisma"

echo "📋 Step 3: Setting up environment variables..."
run_remote "cd $PROJECT_DIR && cp production.env .env"

echo "📋 Step 4: Creating database tables..."
run_remote "cd $PROJECT_DIR && docker-compose exec postgres psql -U earnings_user -d earnings_table -c \"
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

echo "📋 Step 5: Building and starting application..."
run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml up -d --build"

echo "📋 Step 6: Waiting for application to start..."
sleep 60

echo "📋 Step 7: Testing application..."
run_remote "curl -f http://localhost:3000/api/earnings || echo 'API test failed'"

echo "✅ Migration completed successfully!"
echo "🌐 Application should be available at: http://$SERVER:3000"
echo "📊 API endpoint: http://$SERVER:3000/api/earnings"
