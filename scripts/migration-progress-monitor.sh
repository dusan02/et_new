#!/bin/bash

# Migration Progress Monitor
# Usage: ./scripts/migration-progress-monitor.sh

set -e

# Configuration
SERVER="89.185.250.213"
USER="root"
PROJECT_DIR="/opt/earnings-table"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Function to run commands on server
run_remote() {
    ssh $USER@$SERVER "$1"
}

# Function to check migration progress
check_progress() {
    local step=$1
    local description=$2
    
    echo -e "${BLUE}🔍 Checking: $description${NC}"
    
    case $step in
        1)
            # Check if backup directory exists
            if run_remote "test -d /opt/backups/earnings-table" 2>/dev/null; then
                echo -e "${GREEN}✅ Step 1: Backup directory exists${NC}"
                return 0
            else
                echo -e "${YELLOW}⏳ Step 1: Backup not yet created${NC}"
                return 1
            fi
            ;;
        2)
            # Check if Docker is installed
            if run_remote "docker --version" 2>/dev/null; then
                echo -e "${GREEN}✅ Step 2: Docker is installed${NC}"
                return 0
            else
                echo -e "${YELLOW}⏳ Step 2: Docker not yet installed${NC}"
                return 1
            fi
            ;;
        3)
            # Check if project directory is clean
            if run_remote "test ! -d $PROJECT_DIR" 2>/dev/null; then
                echo -e "${GREEN}✅ Step 3: Server is clean${NC}"
                return 0
            else
                echo -e "${YELLOW}⏳ Step 3: Server not yet cleaned${NC}"
                return 1
            fi
            ;;
        4)
            # Check if application is deployed
            if run_remote "test -f $PROJECT_DIR/package.json" 2>/dev/null; then
                echo -e "${GREEN}✅ Step 4: Application is deployed${NC}"
                return 0
            else
                echo -e "${YELLOW}⏳ Step 4: Application not yet deployed${NC}"
                return 1
            fi
            ;;
        5)
            # Check if monitoring is setup
            if run_remote "test -f $PROJECT_DIR/monitoring/monitor.sh" 2>/dev/null; then
                echo -e "${GREEN}✅ Step 5: Monitoring is setup${NC}"
                return 0
            else
                echo -e "${YELLOW}⏳ Step 5: Monitoring not yet setup${NC}"
                return 1
            fi
            ;;
        6)
            # Check if tests are running
            if run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/earnings" 2>/dev/null | grep -q "200"; then
                echo -e "${GREEN}✅ Step 6: Tests are passing${NC}"
                return 0
            else
                echo -e "${YELLOW}⏳ Step 6: Tests not yet completed${NC}"
                return 1
            fi
            ;;
        7)
            # Check if migration is complete
            if run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000" 2>/dev/null | grep -q "200"; then
                echo -e "${GREEN}✅ Step 7: Migration is complete${NC}"
                return 0
            else
                echo -e "${YELLOW}⏳ Step 7: Migration not yet complete${NC}"
                return 1
            fi
            ;;
    esac
}

# Function to show progress bar
show_progress_bar() {
    local current=$1
    local total=$2
    local description=$3
    
    local percentage=$((current * 100 / total))
    local filled=$((percentage / 2))
    local empty=$((50 - filled))
    
    printf "\r${BLUE}Progress: ["
    printf "%${filled}s" | tr ' ' '='
    printf "%${empty}s" | tr ' ' '-'
    printf "] %d%% - %s${NC}" "$percentage" "$description"
    
    if [ "$current" -eq "$total" ]; then
        printf "\n"
    fi
}

# Function to monitor migration
monitor_migration() {
    echo -e "${PURPLE}🔍 Migration Progress Monitor${NC}"
    echo -e "${PURPLE}============================${NC}"
    echo ""
    
    local completed_steps=0
    local total_steps=7
    
    while [ "$completed_steps" -lt "$total_steps" ]; do
        echo -e "${CYAN}Checking migration progress...${NC}"
        
        # Check each step
        for step in $(seq 1 $total_steps); do
            case $step in
                1) description="Creating backup" ;;
                2) description="Checking prerequisites" ;;
                3) description="Cleaning server" ;;
                4) description="Deploying application" ;;
                5) description="Setting up monitoring" ;;
                6) description="Running tests" ;;
                7) description="Finalizing migration" ;;
            esac
            
            if check_progress $step "$description"; then
                if [ "$step" -gt "$completed_steps" ]; then
                    completed_steps=$step
                    show_progress_bar $completed_steps $total_steps "$description"
                fi
            fi
        done
        
        if [ "$completed_steps" -lt "$total_steps" ]; then
            echo -e "\n${YELLOW}⏳ Waiting for next step to complete...${NC}"
            sleep 30
        fi
    done
    
    echo ""
    echo -e "${GREEN}🎉 Migration completed successfully!${NC}"
    echo -e "${GREEN}Progress: [================================================] 100%% - Complete${NC}"
    echo ""
    echo -e "${CYAN}📊 Final Status:${NC}"
    echo -e "   🌐 Application: http://$SERVER:3000"
    echo -e "   📊 API: http://$SERVER:3000/api/earnings"
    echo -e "   📈 Stats: http://$SERVER:3000/api/earnings/stats"
}

# Main function
main() {
    monitor_migration
}

# Run main function
main "$@"
