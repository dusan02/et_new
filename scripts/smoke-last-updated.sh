#!/bin/bash
set -e
echo "DB (direct) vs API comparison"
sqlite3 prisma/dev.db "SELECT MAX(updatedAt) FROM MarketData;" | sed 's/|/ /g' | awk '{print "DB_MAX:", $0}'
curl -s "https://earningstable.com/api/market/last-updated?t=$(date +%s)" | jq -r '.dbMaxUpdatedAt as $a | "API_MAX: \($a)"'
curl -sI "https://earningstable.com/api/market/last-updated?t=$(date +%s)" | sed -n '1,20p' | grep -iE 'cache|cf-cache|etag|age|expires'
