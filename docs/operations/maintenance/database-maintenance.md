# Database Maintenance Guide

This guide covers all aspects of maintaining the PostgreSQL database for the Kavach authentication system, including regular maintenance tasks, performance optimization, backup procedures, and troubleshooting.

## Overview

The PostgreSQL database is the core data store for the authentication system, containing user accounts, profiles, sessions, and audit logs. Proper maintenance ensures optimal performance, data integrity, and system reliability.

## Database Architecture

### Current Setup
- **Database Engine**: PostgreSQL 15.x
- **Connection Pooling**: PgBouncer (recommended) or application-level pooling
- **Replication**: Primary-replica setup (production)
- **Backup Strategy**: Continuous WAL archiving + daily full backups
- **Monitoring**: Real-time performance and health monitoring

### Key Tables
- `users` - User account information
- `customer_profiles` - Customer profile data
- `expert_profiles` - Expert profile data
- `sessions` - Active user sessions
- `email_verifications` - Email verification tokens
- `audit_logs` - System audit trail

## Daily Maintenance Tasks

### Morning Checks (9:00 AM)

```bash
#!/bin/bash
# daily-db-check.sh

echo "=== Daily Database Health Check ==="
echo "Date: $(date)"

# Check database connectivity
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Database connectivity: OK"
else
    echo "✗ Database connectivity: FAILED"
    exit 1
fi

# Check database size
DB_SIZE=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
echo "Database size: $DB_SIZE"

# Check active connections
ACTIVE_CONN=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
echo "Active connections: $ACTIVE_CONN"

# Check for long-running queries
LONG_QUERIES=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';")
if [ $LONG_QUERIES -gt 0 ]; then
    echo "⚠ Long-running queries detected: $LONG_QUERIES"
else
    echo "✓ No long-running queries"
fi

# Check replication lag (if applicable)
if [ ! -z "$REPLICA_HOST" ]; then
    LAG=$(psql -h $REPLICA_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));")
    echo "Replication lag: ${LAG}s"
fi

echo "=== End Daily Check ==="
```

### Key Metrics to Monitor

```sql
-- Database size growth
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Connection statistics
SELECT 
    state,
    count(*) as connections
FROM pg_stat_activity 
GROUP BY state;

-- Top queries by execution time
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;
```

## Weekly Maintenance Tasks

### Database Statistics Update

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "=== Weekly Database Maintenance ==="
echo "Date: $(date)"

# Update table statistics
echo "Updating table statistics..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "ANALYZE;"

# Vacuum analyze all tables
echo "Running VACUUM ANALYZE..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "VACUUM ANALYZE;"

# Check for bloated tables
echo "Checking for table bloat..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /scripts/check-bloat.sql

# Reindex if necessary (during maintenance window)
echo "Checking index health..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
ORDER BY pg_relation_size(indexrelid) DESC;
"

echo "=== Weekly Maintenance Complete ==="
```

### Performance Analysis

```sql
-- Check slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE calls > 100
ORDER BY mean_time DESC 
LIMIT 20;

-- Check table and index sizes
SELECT 
    t.tablename,
    pg_size_pretty(pg_total_relation_size(t.tablename::regclass)) as table_size,
    pg_size_pretty(pg_relation_size(t.tablename::regclass)) as data_size,
    pg_size_pretty(pg_total_relation_size(t.tablename::regclass) - pg_relation_size(t.tablename::regclass)) as index_size
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY pg_total_relation_size(t.tablename::regclass) DESC;

-- Check for unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Monthly Maintenance Tasks

### Full Database Health Check

```bash
#!/bin/bash
# monthly-maintenance.sh

echo "=== Monthly Database Maintenance ==="
echo "Date: $(date)"

# Full database vacuum (during maintenance window)
echo "Running VACUUM FULL on selected tables..."
# Only run on tables with significant bloat
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "VACUUM FULL sessions;"

# Rebuild indexes if necessary
echo "Rebuilding critical indexes..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "REINDEX INDEX CONCURRENTLY users_email_idx;"

# Update PostgreSQL configuration if needed
echo "Checking PostgreSQL configuration..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT name, setting, unit, context 
FROM pg_settings 
WHERE name IN (
    'shared_buffers',
    'effective_cache_size',
    'maintenance_work_mem',
    'checkpoint_completion_target',
    'wal_buffers',
    'default_statistics_target'
);
"

# Check for security updates
echo "Checking PostgreSQL version..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();"

echo "=== Monthly Maintenance Complete ==="
```

### Capacity Planning

```sql
-- Database growth analysis
WITH monthly_growth AS (
    SELECT 
        date_trunc('month', created_at) as month,
        count(*) as new_users
    FROM users 
    WHERE created_at >= now() - interval '12 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY month
)
SELECT 
    month,
    new_users,
    sum(new_users) OVER (ORDER BY month) as cumulative_users,
    lag(new_users) OVER (ORDER BY month) as prev_month,
    round(((new_users::float / lag(new_users) OVER (ORDER BY month)) - 1) * 100, 2) as growth_rate
FROM monthly_growth;

-- Storage growth projection
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as current_size,
    pg_size_pretty(pg_database_size(current_database()) * 1.2) as projected_20_percent_growth,
    pg_size_pretty(pg_database_size(current_database()) * 1.5) as projected_50_percent_growth;
```

## Backup and Recovery

### Backup Strategy

#### Continuous WAL Archiving

```bash
# postgresql.conf settings
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
wal_level = replica
max_wal_senders = 3
```

#### Daily Full Backup

```bash
#!/bin/bash
# daily-backup.sh

BACKUP_DIR="/backup/daily"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="kavach_auth"

echo "Starting backup at $(date)"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -b -v -f "$BACKUP_DIR/backup_${DATE}.dump"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully: backup_${DATE}.dump"
    
    # Compress backup
    gzip "$BACKUP_DIR/backup_${DATE}.dump"
    
    # Upload to S3 (if configured)
    if [ ! -z "$S3_BUCKET" ]; then
        aws s3 cp "$BACKUP_DIR/backup_${DATE}.dump.gz" "s3://$S3_BUCKET/database-backups/"
    fi
    
    # Clean up old backups (keep 7 days)
    find $BACKUP_DIR -name "backup_*.dump.gz" -mtime +7 -delete
    
else
    echo "Backup failed!"
    exit 1
fi

echo "Backup process completed at $(date)"
```

#### Point-in-Time Recovery Setup

```bash
# Enable point-in-time recovery
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
max_wal_senders = 3
hot_standby = on

# Create base backup
pg_basebackup -h $DB_HOST -U $DB_USER -D /backup/base -P -W -R -X stream
```

### Recovery Procedures

#### Full Database Restore

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE="$1"
TARGET_DB="kavach_auth_restored"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

echo "Restoring database from $BACKUP_FILE"

# Create new database
createdb -h $DB_HOST -U $DB_USER $TARGET_DB

# Restore from backup
pg_restore -h $DB_HOST -U $DB_USER -d $TARGET_DB -v "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Database restored successfully to $TARGET_DB"
else
    echo "Database restore failed!"
    exit 1
fi
```

#### Point-in-Time Recovery

```bash
#!/bin/bash
# point-in-time-recovery.sh

RECOVERY_TARGET_TIME="$1"
BASE_BACKUP_DIR="/backup/base"
WAL_ARCHIVE_DIR="/backup/wal"

if [ -z "$RECOVERY_TARGET_TIME" ]; then
    echo "Usage: $0 'YYYY-MM-DD HH:MM:SS'"
    exit 1
fi

echo "Performing point-in-time recovery to $RECOVERY_TARGET_TIME"

# Stop PostgreSQL
systemctl stop postgresql

# Restore base backup
rm -rf /var/lib/postgresql/data/*
cp -R $BASE_BACKUP_DIR/* /var/lib/postgresql/data/

# Create recovery configuration
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'cp $WAL_ARCHIVE_DIR/%f %p'
recovery_target_time = '$RECOVERY_TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Start PostgreSQL
systemctl start postgresql

echo "Point-in-time recovery initiated"
```

## Performance Optimization

### Query Optimization

#### Identify Slow Queries

```sql
-- Enable query logging
-- postgresql.conf
log_min_duration_statement = 1000  -- Log queries taking > 1 second
log_statement = 'all'
log_duration = on

-- Top slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

#### Index Optimization

```sql
-- Missing indexes detection
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    seq_tup_read / seq_scan as avg_seq_read
FROM pg_stat_user_tables 
WHERE seq_scan > 0 
ORDER BY seq_tup_read DESC;

-- Create missing indexes
CREATE INDEX CONCURRENTLY idx_users_email_verified 
ON users (email) WHERE email_verified = true;

CREATE INDEX CONCURRENTLY idx_sessions_expires_at 
ON sessions (expires_at) WHERE expires_at > now();

CREATE INDEX CONCURRENTLY idx_audit_logs_created_at 
ON audit_logs (created_at) WHERE created_at >= now() - interval '30 days';
```

### Configuration Tuning

#### Memory Settings

```bash
# postgresql.conf - Adjust based on available RAM

# For 8GB RAM server
shared_buffers = 2GB                    # 25% of RAM
effective_cache_size = 6GB              # 75% of RAM
maintenance_work_mem = 512MB            # For maintenance operations
work_mem = 32MB                         # Per connection work memory

# For 16GB RAM server
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
work_mem = 64MB
```

#### Connection Settings

```bash
# postgresql.conf
max_connections = 200                   # Adjust based on application needs
shared_preload_libraries = 'pg_stat_statements'

# Connection pooling with PgBouncer
# pgbouncer.ini
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 50
```

#### Checkpoint and WAL Settings

```bash
# postgresql.conf
checkpoint_completion_target = 0.9      # Spread checkpoints over 90% of interval
wal_buffers = 16MB                      # WAL buffer size
checkpoint_timeout = 15min              # Maximum time between checkpoints
max_wal_size = 4GB                      # Maximum WAL size before checkpoint
```

## Monitoring and Alerting

### Key Metrics to Monitor

#### Database Performance

```sql
-- Connection statistics
SELECT 
    state,
    count(*) as connections,
    max(now() - state_change) as max_duration
FROM pg_stat_activity 
GROUP BY state;

-- Cache hit ratio (should be > 95%)
SELECT 
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
FROM pg_statio_user_tables;

-- Database locks
SELECT 
    mode,
    count(*) as lock_count
FROM pg_locks 
GROUP BY mode
ORDER BY lock_count DESC;
```

#### System Health

```bash
#!/bin/bash
# monitoring-script.sh

# Disk space check
DISK_USAGE=$(df -h /var/lib/postgresql | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "WARNING: Disk usage is ${DISK_USAGE}%"
fi

# Memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
echo "Memory usage: ${MEMORY_USAGE}%"

# CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
echo "CPU usage: ${CPU_USAGE}%"
```

### Alert Thresholds

```yaml
# Example alert configuration
alerts:
  - name: "Database Connection Limit"
    condition: "connections > 180"
    severity: "warning"
    
  - name: "Database Down"
    condition: "pg_up == 0"
    severity: "critical"
    
  - name: "Slow Query Alert"
    condition: "query_duration > 5s"
    severity: "warning"
    
  - name: "Replication Lag"
    condition: "replication_lag > 60s"
    severity: "warning"
    
  - name: "Disk Space Low"
    condition: "disk_usage > 85%"
    severity: "critical"
```

## Security Maintenance

### User Access Review

```sql
-- Review database users and permissions
SELECT 
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolconnlimit,
    rolvaliduntil
FROM pg_roles
ORDER BY rolname;

-- Review database permissions
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
ORDER BY grantee, table_name;
```

### Security Updates

```bash
#!/bin/bash
# security-update.sh

echo "Checking for PostgreSQL security updates..."

# Check current version
CURRENT_VERSION=$(psql -t -c "SELECT version();" | head -1)
echo "Current version: $CURRENT_VERSION"

# Check for available updates (Ubuntu/Debian)
apt list --upgradable | grep postgresql

# Update PostgreSQL (during maintenance window)
# apt update && apt upgrade postgresql-15

# Verify update
# systemctl restart postgresql
# psql -t -c "SELECT version();"
```

### Audit Configuration

```bash
# postgresql.conf - Enable audit logging
log_connections = on
log_disconnections = on
log_statement = 'ddl'                   # Log DDL statements
log_min_duration_statement = 0          # Log all statements (for audit)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

## Troubleshooting Common Issues

### Connection Issues

```bash
# Check if PostgreSQL is running
systemctl status postgresql

# Check port availability
netstat -tlnp | grep 5432

# Test connection
psql -h localhost -U postgres -c "SELECT 1;"

# Check connection limits
psql -c "SELECT count(*) FROM pg_stat_activity;"
psql -c "SHOW max_connections;"
```

### Performance Issues

```sql
-- Find blocking queries
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

### Storage Issues

```bash
# Check disk space
df -h /var/lib/postgresql

# Check database sizes
psql -c "
SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
ORDER BY pg_database_size(datname) DESC;
"

# Clean up old WAL files (if archiving is not working)
# Be very careful with this command!
# pg_archivecleanup /var/lib/postgresql/data/pg_wal 000000010000000000000010
```

## Emergency Procedures

### Database Corruption

```bash
#!/bin/bash
# corruption-recovery.sh

echo "Database corruption detected. Starting recovery..."

# Stop application connections
# Update load balancer to stop routing traffic

# Check corruption extent
psql -c "SELECT * FROM pg_stat_database WHERE datname = 'kavach_auth';"

# Attempt automatic repair
psql -c "VACUUM FULL;"
psql -c "REINDEX DATABASE kavach_auth;"

# If corruption is severe, restore from backup
# ./restore-database.sh /backup/latest.dump

echo "Recovery process completed. Verify data integrity before resuming operations."
```

### Emergency Maintenance Window

```bash
#!/bin/bash
# emergency-maintenance.sh

echo "Starting emergency maintenance at $(date)"

# Notify stakeholders
# Send alert to operations team

# Put application in maintenance mode
# Update load balancer health check to fail

# Perform emergency maintenance
case "$1" in
    "reindex")
        psql -c "REINDEX DATABASE kavach_auth;"
        ;;
    "vacuum")
        psql -c "VACUUM FULL;"
        ;;
    "restore")
        ./restore-database.sh "$2"
        ;;
    *)
        echo "Usage: $0 {reindex|vacuum|restore} [backup_file]"
        exit 1
        ;;
esac

# Verify system health
./daily-db-check.sh

# Resume normal operations
# Update load balancer health check to pass

echo "Emergency maintenance completed at $(date)"
```

## Documentation and Compliance

### Change Log

Maintain a detailed change log for all database modifications:

```
Date: 2025-01-20
Change: Added index on users.email_verified
Reason: Improve login query performance
Impact: Reduced login time by 50ms
Rollback: DROP INDEX idx_users_email_verified;
```

### Compliance Requirements

- **Data Retention**: Implement automated data purging for compliance
- **Audit Trails**: Maintain comprehensive audit logs
- **Access Controls**: Regular review of database access permissions
- **Encryption**: Ensure data encryption at rest and in transit

### Regular Reports

Generate monthly database health reports including:
- Performance metrics
- Growth statistics
- Security audit results
- Backup verification status
- Capacity planning recommendations

This maintenance guide should be reviewed and updated quarterly to ensure it remains current with system changes and best practices.