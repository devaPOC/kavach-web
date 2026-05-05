# Common Issues Troubleshooting Guide

This guide provides solutions for the most frequently encountered issues in the Kavach authentication system. Issues are organized by category with step-by-step troubleshooting procedures.

## Quick Reference

### Emergency Contacts
- **On-Call Engineer**: +1-555-0123
- **Database Team**: +1-555-0125
- **Security Team**: +1-555-0126

### System Status Checks
```bash
# Quick health check
curl -f http://localhost:3000/api/v1/health

# Database connectivity
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Redis connectivity
redis-cli -h $REDIS_HOST ping
```

## Application Issues

### Issue: Application Won't Start

**Symptoms:**
- Application fails to start
- Error messages in logs about missing dependencies or configuration
- Port binding errors

**Troubleshooting Steps:**

1. **Check Environment Variables**
   ```bash
   # Verify required environment variables are set
   echo "NODE_ENV: $NODE_ENV"
   echo "DATABASE_URL: $DATABASE_URL"
   echo "JWT_SECRET: $JWT_SECRET"
   echo "PORT: $PORT"
   
   # Run environment validation
   npm run validate-env
   ```

2. **Check Port Availability**
   ```bash
   # Check if port is already in use
   netstat -tlnp | grep :3000
   lsof -i :3000
   
   # Kill process using the port if necessary
   kill -9 $(lsof -t -i:3000)
   ```

3. **Check Dependencies**
   ```bash
   # Verify Node.js version
   node --version  # Should be 18+
   
   # Check npm dependencies
   npm ls
   npm audit
   
   # Reinstall dependencies if needed
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Check Database Connection**
   ```bash
   # Test database connectivity
   npm run db:test
   
   # Check database migrations
   npm run db:migrate:status
   ```

**Resolution:**
- Fix missing environment variables
- Update dependencies if needed
- Run database migrations
- Restart application

### Issue: High Memory Usage

**Symptoms:**
- Application consuming excessive memory
- Out of memory errors
- Slow response times

**Troubleshooting Steps:**

1. **Monitor Memory Usage**
   ```bash
   # Check current memory usage
   ps aux | grep node
   top -p $(pgrep node)
   
   # Monitor memory over time
   while true; do
     echo "$(date): $(ps -o pid,vsz,rss,comm -p $(pgrep node))"
     sleep 60
   done
   ```

2. **Check for Memory Leaks**
   ```bash
   # Enable Node.js memory profiling
   node --inspect --max-old-space-size=4096 dist/index.js
   
   # Use heap dump analysis
   npm install -g heapdump
   kill -USR2 $(pgrep node)  # Generate heap dump
   ```

3. **Review Application Logs**
   ```bash
   # Check for memory-related errors
   grep -i "memory\|heap\|out of" /var/log/app.log
   
   # Check for large object processing
   grep -i "large\|bulk\|batch" /var/log/app.log
   ```

**Resolution:**
- Increase memory limits if legitimate usage
- Fix memory leaks in code
- Implement pagination for large data sets
- Add memory monitoring alerts

### Issue: Slow Response Times

**Symptoms:**
- API responses taking longer than expected
- Timeouts on client applications
- High CPU usage

**Troubleshooting Steps:**

1. **Check Response Time Metrics**
   ```bash
   # Test API response times
   curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/health
   
   # curl-format.txt content:
   # time_namelookup:  %{time_namelookup}\n
   # time_connect:     %{time_connect}\n
   # time_appconnect:  %{time_appconnect}\n
   # time_pretransfer: %{time_pretransfer}\n
   # time_redirect:    %{time_redirect}\n
   # time_starttransfer: %{time_starttransfer}\n
   # time_total:       %{time_total}\n
   ```

2. **Analyze Database Performance**
   ```sql
   -- Check slow queries
   SELECT query, calls, total_time, mean_time 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
   
   -- Check for blocking queries
   SELECT pid, state, query, query_start 
   FROM pg_stat_activity 
   WHERE state != 'idle' 
   ORDER BY query_start;
   ```

3. **Check System Resources**
   ```bash
   # CPU usage
   top -bn1 | grep "Cpu(s)"
   
   # Memory usage
   free -h
   
   # Disk I/O
   iostat -x 1 5
   
   # Network connections
   netstat -an | grep :3000 | wc -l
   ```

**Resolution:**
- Optimize slow database queries
- Add database indexes
- Implement caching
- Scale horizontally if needed

## Database Issues

### Issue: Database Connection Failures

**Symptoms:**
- "Connection refused" errors
- "Too many connections" errors
- Application unable to connect to database

**Troubleshooting Steps:**

1. **Check Database Status**
   ```bash
   # Check if PostgreSQL is running
   systemctl status postgresql
   
   # Check database logs
   tail -f /var/log/postgresql/postgresql-15-main.log
   
   # Test direct connection
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   ```

2. **Check Connection Limits**
   ```sql
   -- Check current connections
   SELECT count(*) FROM pg_stat_activity;
   
   -- Check connection limit
   SHOW max_connections;
   
   -- Check connections by state
   SELECT state, count(*) 
   FROM pg_stat_activity 
   GROUP BY state;
   ```

3. **Check Network Connectivity**
   ```bash
   # Test network connectivity
   telnet $DB_HOST 5432
   
   # Check firewall rules
   iptables -L | grep 5432
   
   # Check DNS resolution
   nslookup $DB_HOST
   ```

**Resolution:**
- Restart PostgreSQL if needed
- Increase max_connections if appropriate
- Implement connection pooling
- Fix network/firewall issues

### Issue: Database Performance Degradation

**Symptoms:**
- Slow query execution
- High database CPU usage
- Lock contention

**Troubleshooting Steps:**

1. **Identify Slow Queries**
   ```sql
   -- Top slow queries
   SELECT query, calls, total_time, mean_time, rows
   FROM pg_stat_statements 
   ORDER BY total_time DESC 
   LIMIT 10;
   
   -- Currently running slow queries
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
   ```

2. **Check for Lock Contention**
   ```sql
   -- Check for locks
   SELECT 
     t.relname,
     l.locktype,
     page,
     virtualtransaction,
     pid,
     mode,
     granted
   FROM pg_locks l, pg_stat_all_tables t
   WHERE l.relation = t.relid
   ORDER BY relation ASC;
   ```

3. **Analyze Index Usage**
   ```sql
   -- Check index usage
   SELECT 
     schemaname,
     tablename,
     indexname,
     idx_tup_read,
     idx_tup_fetch
   FROM pg_stat_user_indexes 
   ORDER BY idx_tup_read DESC;
   
   -- Check for missing indexes
   SELECT 
     schemaname,
     tablename,
     seq_scan,
     seq_tup_read,
     idx_scan,
     seq_tup_read / seq_scan as avg_seq_read
   FROM pg_stat_user_tables 
   WHERE seq_scan > 0 
   ORDER BY seq_tup_read DESC;
   ```

**Resolution:**
- Kill long-running queries if necessary
- Add missing indexes
- Optimize query performance
- Run VACUUM ANALYZE

### Issue: Database Storage Full

**Symptoms:**
- "No space left on device" errors
- Database write operations failing
- Application errors related to database writes

**Troubleshooting Steps:**

1. **Check Disk Space**
   ```bash
   # Check overall disk usage
   df -h
   
   # Check PostgreSQL data directory
   du -sh /var/lib/postgresql/
   
   # Check individual database sizes
   psql -c "
   SELECT 
     datname,
     pg_size_pretty(pg_database_size(datname)) as size
   FROM pg_database
   ORDER BY pg_database_size(datname) DESC;
   "
   ```

2. **Identify Large Tables**
   ```sql
   -- Check table sizes
   SELECT 
     schemaname,
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
   FROM pg_tables 
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

3. **Check WAL Files**
   ```bash
   # Check WAL directory size
   du -sh /var/lib/postgresql/15/main/pg_wal/
   
   # Count WAL files
   ls -la /var/lib/postgresql/15/main/pg_wal/ | wc -l
   ```

**Resolution:**
- Clean up old data if possible
- Archive and remove old WAL files
- Extend disk space
- Implement data retention policies

## Authentication Issues

### Issue: JWT Token Validation Failures

**Symptoms:**
- Users getting "Invalid token" errors
- Authentication failures for valid users
- Token expiration issues

**Troubleshooting Steps:**

1. **Check JWT Configuration**
   ```bash
   # Verify JWT secret is set
   echo "JWT_SECRET length: ${#JWT_SECRET}"
   
   # Check token expiration settings
   echo "JWT_EXPIRES_IN: $JWT_EXPIRES_IN"
   echo "REFRESH_TOKEN_EXPIRES_IN: $REFRESH_TOKEN_EXPIRES_IN"
   ```

2. **Validate Token Structure**
   ```bash
   # Decode JWT token (without verification)
   echo "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." | base64 -d
   
   # Use online JWT debugger or jwt-cli tool
   jwt decode $TOKEN
   ```

3. **Check System Time**
   ```bash
   # Verify system time is correct
   date
   timedatectl status
   
   # Check NTP synchronization
   ntpq -p
   ```

**Resolution:**
- Verify JWT secret consistency across instances
- Check system time synchronization
- Implement proper token refresh logic
- Add token validation logging

### Issue: Session Management Problems

**Symptoms:**
- Users getting logged out unexpectedly
- Session data not persisting
- Multiple login prompts

**Troubleshooting Steps:**

1. **Check Redis Connection**
   ```bash
   # Test Redis connectivity
   redis-cli -h $REDIS_HOST ping
   
   # Check Redis memory usage
   redis-cli -h $REDIS_HOST info memory
   
   # Check session keys
   redis-cli -h $REDIS_HOST keys "sess:*" | wc -l
   ```

2. **Verify Session Configuration**
   ```bash
   # Check session settings
   echo "SESSION_SECRET: ${SESSION_SECRET:0:10}..."
   echo "SESSION_MAX_AGE: $SESSION_MAX_AGE"
   echo "SESSION_SECURE: $SESSION_SECURE"
   ```

3. **Check Session Storage**
   ```bash
   # Check session data in Redis
   redis-cli -h $REDIS_HOST get "sess:session_id_here"
   
   # Monitor session operations
   redis-cli -h $REDIS_HOST monitor
   ```

**Resolution:**
- Fix Redis connectivity issues
- Adjust session timeout settings
- Implement proper session cleanup
- Check cookie settings

### Issue: Email Verification Not Working

**Symptoms:**
- Verification emails not being sent
- Email delivery failures
- Invalid verification tokens

**Troubleshooting Steps:**

1. **Check SMTP Configuration**
   ```bash
   # Verify SMTP settings
   echo "SMTP_HOST: $SMTP_HOST"
   echo "SMTP_PORT: $SMTP_PORT"
   echo "SMTP_USER: $SMTP_USER"
   echo "FROM_EMAIL: $FROM_EMAIL"
   
   # Test SMTP connection
   telnet $SMTP_HOST $SMTP_PORT
   ```

2. **Test Email Sending**
   ```bash
   # Run email test script
   npm run test:email
   
   # Check email service logs
   grep -i "email\|smtp" /var/log/app.log
   ```

3. **Check Email Queue**
   ```sql
   -- Check pending email verifications
   SELECT 
     email,
     created_at,
     expires_at,
     verified
   FROM email_verifications 
   WHERE verified = false
   ORDER BY created_at DESC;
   ```

**Resolution:**
- Fix SMTP configuration
- Check email service provider status
- Implement email retry logic
- Verify DNS/SPF records

## Performance Issues

### Issue: High CPU Usage

**Symptoms:**
- Server CPU usage consistently high
- Slow response times
- Application timeouts

**Troubleshooting Steps:**

1. **Identify CPU-Intensive Processes**
   ```bash
   # Check top CPU consumers
   top -o %CPU
   
   # Check Node.js process specifically
   ps aux | grep node
   
   # Monitor CPU usage over time
   sar -u 1 60
   ```

2. **Profile Application Performance**
   ```bash
   # Enable Node.js profiling
   node --prof dist/index.js
   
   # Generate flame graph
   npm install -g 0x
   0x dist/index.js
   ```

3. **Check Database CPU Usage**
   ```sql
   -- Check database CPU-intensive queries
   SELECT 
     query,
     calls,
     total_time,
     mean_time,
     (total_time / sum(total_time) OVER()) * 100 as percentage
   FROM pg_stat_statements 
   ORDER BY total_time DESC 
   LIMIT 10;
   ```

**Resolution:**
- Optimize CPU-intensive code
- Add caching for expensive operations
- Scale horizontally
- Optimize database queries

### Issue: Memory Leaks

**Symptoms:**
- Gradually increasing memory usage
- Out of memory errors after extended runtime
- Application crashes

**Troubleshooting Steps:**

1. **Monitor Memory Growth**
   ```bash
   # Track memory usage over time
   while true; do
     echo "$(date): $(ps -o pid,vsz,rss,comm -p $(pgrep node))"
     sleep 300  # Check every 5 minutes
   done > memory-usage.log
   ```

2. **Generate Heap Dumps**
   ```bash
   # Install heapdump module
   npm install heapdump
   
   # Generate heap dump
   kill -USR2 $(pgrep node)
   
   # Analyze with Chrome DevTools or clinic.js
   npm install -g clinic
   clinic doctor -- node dist/index.js
   ```

3. **Check for Common Leak Sources**
   ```bash
   # Check for event listener leaks
   grep -r "addEventListener\|on(" src/
   
   # Check for timer leaks
   grep -r "setInterval\|setTimeout" src/
   
   # Check for unclosed connections
   grep -r "createConnection\|connect" src/
   ```

**Resolution:**
- Fix identified memory leaks
- Implement proper cleanup in event handlers
- Close database connections properly
- Add memory monitoring alerts

## Network Issues

### Issue: Load Balancer Health Check Failures

**Symptoms:**
- Load balancer marking instances as unhealthy
- Traffic not being routed to application
- Intermittent connectivity issues

**Troubleshooting Steps:**

1. **Check Health Endpoint**
   ```bash
   # Test health endpoint directly
   curl -v http://localhost:3000/api/v1/health
   
   # Check response time
   curl -w "%{time_total}\n" -o /dev/null -s http://localhost:3000/api/v1/health
   ```

2. **Verify Load Balancer Configuration**
   ```bash
   # Check load balancer target health (AWS)
   aws elbv2 describe-target-health --target-group-arn arn:aws:...
   
   # Check nginx upstream status
   curl http://nginx-server/nginx_status
   ```

3. **Check Network Connectivity**
   ```bash
   # Test connectivity from load balancer
   telnet app-server 3000
   
   # Check firewall rules
   iptables -L
   
   # Check security groups (AWS)
   aws ec2 describe-security-groups --group-ids sg-...
   ```

**Resolution:**
- Fix health endpoint issues
- Adjust health check parameters
- Update security group rules
- Verify network configuration

### Issue: SSL Certificate Problems

**Symptoms:**
- SSL certificate warnings in browsers
- HTTPS connection failures
- Certificate expiration errors

**Troubleshooting Steps:**

1. **Check Certificate Status**
   ```bash
   # Check certificate expiration
   openssl x509 -in /path/to/cert.pem -text -noout | grep "Not After"
   
   # Test SSL connection
   openssl s_client -connect yourdomain.com:443
   
   # Check certificate chain
   curl -I https://yourdomain.com
   ```

2. **Verify Certificate Configuration**
   ```bash
   # Check nginx SSL configuration
   nginx -t
   
   # Check certificate files
   ls -la /etc/ssl/certs/
   
   # Verify certificate matches private key
   openssl x509 -noout -modulus -in cert.pem | openssl md5
   openssl rsa -noout -modulus -in key.pem | openssl md5
   ```

**Resolution:**
- Renew expired certificates
- Fix certificate chain issues
- Update SSL configuration
- Implement automated certificate renewal

## Monitoring and Alerting Issues

### Issue: Missing or False Alerts

**Symptoms:**
- Not receiving expected alerts
- Getting false positive alerts
- Alert fatigue from too many notifications

**Troubleshooting Steps:**

1. **Check Alert Configuration**
   ```bash
   # Verify alert rules
   cat /etc/alertmanager/alertmanager.yml
   
   # Test alert conditions
   curl -X POST http://alertmanager:9093/api/v1/alerts
   ```

2. **Check Monitoring Data**
   ```bash
   # Verify metrics collection
   curl http://localhost:9090/metrics
   
   # Check Prometheus targets
   curl http://prometheus:9090/api/v1/targets
   ```

3. **Test Notification Channels**
   ```bash
   # Test email notifications
   echo "Test alert" | mail -s "Test Alert" admin@yourdomain.com
   
   # Test Slack notifications
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test alert"}' \
     $SLACK_WEBHOOK_URL
   ```

**Resolution:**
- Adjust alert thresholds
- Fix notification configuration
- Implement alert grouping
- Add alert documentation

## Emergency Procedures

### System-Wide Outage

1. **Immediate Response**
   ```bash
   # Check system status
   systemctl status application
   systemctl status postgresql
   systemctl status redis
   
   # Check logs for errors
   journalctl -u application -f
   tail -f /var/log/app.log
   ```

2. **Escalation**
   - Notify on-call engineer immediately
   - Update status page
   - Communicate with stakeholders

3. **Recovery**
   - Follow incident response procedures
   - Document all actions taken
   - Conduct post-mortem review

### Data Corruption

1. **Stop Application**
   ```bash
   # Stop application to prevent further corruption
   systemctl stop application
   
   # Put load balancer in maintenance mode
   # Update health check to fail
   ```

2. **Assess Damage**
   ```sql
   -- Check data integrity
   SELECT * FROM pg_stat_database WHERE datname = 'kavach_auth';
   
   -- Run consistency checks
   VACUUM ANALYZE;
   ```

3. **Recovery Options**
   - Restore from backup if corruption is severe
   - Repair corrupted data if possible
   - Implement additional data validation

### Security Incident

1. **Immediate Actions**
   - Isolate affected systems
   - Preserve evidence
   - Notify security team

2. **Investigation**
   - Analyze logs for suspicious activity
   - Check for unauthorized access
   - Assess data exposure

3. **Recovery**
   - Patch vulnerabilities
   - Reset compromised credentials
   - Implement additional security measures

## Prevention Strategies

### Proactive Monitoring

- Implement comprehensive health checks
- Set up proper alerting thresholds
- Monitor key performance indicators
- Regular security scans

### Regular Maintenance

- Keep systems updated
- Perform regular backups
- Clean up old data
- Review and update documentation

### Capacity Planning

- Monitor resource usage trends
- Plan for growth
- Implement auto-scaling
- Regular performance testing

### Team Preparedness

- Regular incident response drills
- Keep documentation updated
- Cross-train team members
- Maintain emergency contact lists

This troubleshooting guide should be updated regularly based on new issues encountered and lessons learned from incident responses.