# Production Runbook

## 🚨 Emergency Procedures

### 1. API Health Check Failed

```bash
# Quick diagnosis
npm run smoke:api

# If fails, check logs
tail -f logs/app.log | grep -E "(HEALTH|ERROR|SANITY)"

# Check specific issues
curl -s localhost:3000/api/earnings | jq '
{ total:(.data|length),
  stale:.meta.note? // "stale-fallback" or null,
  insaneRevenue: ([.data[]|select(.revenueActual!=null and .revenueActual>1e12)]|length),
  missingPrice: ([.data[]|select((.currentPrice!=null) and (.previousClose==null))]|length) }'
```

### 2. Data Fetch Issues

```bash
# Manual data fetch
npm run job:fetch:today

# Check fetch status
npm run job:status

# Reset and refetch if needed
npm run job:reset:today
npm run job:fetch:today
```

### 3. Revenue Units Issue

```bash
# Check for bad revenue data
node scripts/migrate-bad-revenue-data.js

# Verify fix
curl -s localhost:3000/api/earnings | jq '.data[] | select(.revenueActual > 1e12)'
```

### 4. External API Failure

```bash
# Enable fallback mode
export EARNINGS_FALLBACK=1
npm run deploy:production

# Check fallback status
curl -s localhost:3000/api/earnings | jq '.meta.note'
```

## 📊 Daily Health Checks

### Morning Checklist (9:30 ET)

- [ ] `npm run smoke:api` passes
- [ ] Earnings count > 0
- [ ] No insane revenue values
- [ ] Price data available
- [ ] No BigInt serialization issues

### Monitoring Commands

```bash
# Health metrics
curl -s localhost:3000/api/health | jq

# API performance
curl -s localhost:3000/api/earnings | jq '.meta.duration'

# Data quality
node scripts/api-smoke-test.js
```

## 🔧 Maintenance Tasks

### Weekly

- [ ] Review error logs
- [ ] Check metric trends
- [ ] Verify backup procedures
- [ ] Update dependencies

### Monthly

- [ ] Database cleanup
- [ ] Performance review
- [ ] Security audit
- [ ] Capacity planning

## 📈 Key Metrics to Monitor

### Critical Alerts

- `earnings_ingest_count == 0` after 9:30 ET
- `earnings_publish_total == 0` when `ingest_count > 0`
- `max(revenueActual) > 1e12`
- `abs(priceChangePercent) > 50`
- API latency > 5s
- Error rate > 10%

### Performance Targets

- API response time < 500ms
- Data freshness < 5 minutes
- Uptime > 99.9%
- Error rate < 1%

## 🚀 Deployment Procedures

### Pre-deployment

```bash
# Run all tests
npm test
npm run smoke:api
npm run contract:test

# Check environment
echo $NODE_ENV
echo $USE_MOCK_EARNINGS
echo $EARNINGS_FALLBACK
```

### Post-deployment

```bash
# Verify deployment
curl -s localhost:3000/api/earnings | jq '.status'

# Run health check
npm run smoke:api

# Monitor for 5 minutes
watch -n 30 'curl -s localhost:3000/api/earnings | jq ".data | length"'
```

## 🔍 Troubleshooting Guide

### Common Issues

#### 1. "No data on frontend"

- Check API response: `curl localhost:3000/api/earnings`
- Verify database: `npm run db:check`
- Check fetch job: `npm run job:status`

#### 2. "Revenue showing as T instead of M"

- Run migration: `node scripts/migrate-bad-revenue-data.js`
- Check earnings service: `grep -r "1000000" src/`

#### 3. "Price data missing"

- Check Polygon API: `curl "https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apikey=..."`
- Verify database relations: `npm run db:check:relations`

#### 4. "API returning mock data"

- Check environment: `echo $USE_MOCK_EARNINGS`
- Restart with: `USE_MOCK_EARNINGS=0 npm run dev`

### Log Analysis

```bash
# Find errors
grep -i error logs/app.log

# Find health issues
grep -E "(HEALTH|SANITY)" logs/app.log

# Find performance issues
grep -E "(duration|latency)" logs/app.log
```

## 📞 Escalation Procedures

### Level 1 (Immediate)

- API completely down
- Data corruption detected
- Security breach

### Level 2 (Within 1 hour)

- Performance degradation
- Data quality issues
- External API failures

### Level 3 (Within 4 hours)

- Minor bugs
- Enhancement requests
- Documentation updates

## 🔐 Security Considerations

### API Keys

- Rotate monthly
- Monitor usage
- Use environment variables
- Never commit to git

### Data Protection

- Encrypt sensitive data
- Regular backups
- Access logging
- Audit trails

## 📋 Contact Information

### Team Contacts

- **Primary**: [Your Name] - [email] - [phone]
- **Secondary**: [Backup Name] - [email] - [phone]
- **On-call**: [On-call Name] - [phone]

### External Services

- **Finnhub**: [Support Contact]
- **Polygon**: [Support Contact]
- **Hosting**: [Provider Contact]

---

**Last Updated**: [Date]
**Version**: 1.0
**Next Review**: [Date + 1 month]
