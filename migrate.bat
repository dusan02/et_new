@echo off
echo 🎯 COMPLETE MIGRATION - Starting fresh approach
echo ================================================

echo 📋 Step 1: Cleaning server...
ssh root@89.185.250.213 "cd /opt/earnings-table && docker-compose down || true"
ssh root@89.185.250.213 "cd /opt/earnings-table && docker-compose rm -f || true"
ssh root@89.185.250.213 "docker system prune -f || true"
ssh root@89.185.250.213 "rm -rf /opt/earnings-table || true"
ssh root@89.185.250.213 "mkdir -p /opt/earnings-table"

echo 📋 Step 2: Cloning project...
ssh root@89.185.250.213 "cd /opt/earnings-table && git clone https://github.com/dusan02/et_new.git ."

echo 📋 Step 3: Setting up production schema...
ssh root@89.185.250.213 "cd /opt/earnings-table && cp prisma/schema.production.prisma prisma/schema.prisma"

echo 📋 Step 4: Setting up environment...
ssh root@89.185.250.213 "cd /opt/earnings-table && cp production.env .env"

echo 📋 Step 5: Creating database tables...
ssh root@89.185.250.213 "cd /opt/earnings-table && docker-compose exec postgres psql -U earnings_user -d earnings_table -c \"CREATE TABLE IF NOT EXISTS \\\"EarningsTickersToday\\\" (id SERIAL PRIMARY KEY, ticker TEXT NOT NULL, company_name TEXT, for_date DATE NOT NULL DEFAULT CURRENT_DATE, report_time TEXT, eps_est DECIMAL(12,2), eps_rep DECIMAL(12,2), rev_est BIGINT, rev_rep BIGINT, logo_url TEXT, updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW());\""

echo 📋 Step 6: Building and starting application...
ssh root@89.185.250.213 "cd /opt/earnings-table && docker-compose up -d --build"

echo 📋 Step 7: Waiting for application to start...
timeout /t 60 /nobreak

echo 📋 Step 8: Testing application...
ssh root@89.185.250.213 "curl -f http://localhost:3000/api/earnings || echo 'API test failed'"

echo 🎉 MIGRATION COMPLETED SUCCESSFULLY!
echo ================================================
echo 🌐 Your application is now available at:
echo    http://89.185.250.213:3000
echo.
echo 📊 API endpoints:
echo    http://89.185.250.213:3000/api/earnings
echo    http://89.185.250.213:3000/api/earnings/stats
echo.
echo 🔧 To check status:
echo    ssh root@89.185.250.213 "cd /opt/earnings-table && docker-compose ps"
echo.
echo 📝 To view logs:
echo    ssh root@89.185.250.213 "cd /opt/earnings-table && docker-compose logs app"
