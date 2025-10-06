#!/bin/bash
# Restart cron worker on production

echo "🔄 Restarting earnings-cron on production..."

ssh root@bardus << 'EOF'
cd /var/www/earnings-table
pm2 restart earnings-cron
pm2 status
echo "✅ Cron restarted!"
EOF

echo "🎉 Production cron restart completed!"
