# Health Checks and Monitoring Setup

This guide covers the implementation and configuration of comprehensive health checks and monitoring for the Kavach authentication system. Proper health monitoring is essential for maintaining system reliability and enabling proactive issue resolution.

## Overview

The health monitoring system provides multiple layers of checks to ensure system reliability:

- **Application Health**: Basic application functionality
- **Database Health**: Database connectivity and performance
- **External Dependencies**: Third-party service availability
- **System Resources**: CPU, memory, and disk usage
- **Business Logic**: Authentication flow validation

## Health Check Endpoints

### Basic Health Check

**Endpoint**: `GET /api/v1/health`

Returns basic application status and uptime information.

```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production"
}
```

**Implementation**:
```typescript
// src/app/(backend)/api/v1/health/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const startTime = process.hrtime.bigint();
  
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: Number(process.hrtime.bigint() - startTime) / 1000000 // ms
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      }, 
      { status: 503 }
    );
  }
}
```

### Detailed Health Check

**Endpoint**: `GET /api/v1/health/detailed`

Provides comprehensive system health information including dependencies.

```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15,
      "connections": {
        "active": 5,
        "idle": 10,
        "total": 15
      }
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2,
      "memory": {
        "used": "50MB",
        "peak": "75MB"
      }
    },
    "email": {
      "status": "healthy",
      "responseTime": 100,
      "lastSent": "2025-01-20T10:25:00.000Z"
    }
  },
  "system": {
    "memory": {
      "used": "512MB",
      "total": "2GB",
      "percentage": 25
    },
    "cpu": {
      "usage": 15.5
    }
  }
}
```

**Implementation**:
```typescript
// src/lib/health/health-checker.ts
import { db } from '@/lib/database';
import { redis } from '@/lib/redis';
import { emailService } from '@/lib/email';

export class HealthChecker {
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await db.raw('SELECT 1');
      
      // Get connection stats
      const connectionStats = await db.raw(`
        SELECT 
          count(*) as total,
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        connections: connectionStats.rows[0]
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      await redis.ping();
      
      const info = await redis.info('memory');
      const memoryInfo = this.parseRedisInfo(info);

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        memory: {
          used: memoryInfo.used_memory_human,
          peak: memoryInfo.used_memory_peak_human
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async checkEmail(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test SMTP connection without sending email
      await emailService.verifyConnection();

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastSent: await this.getLastEmailSentTime()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  getSystemHealth(): SystemHealth {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        used: this.formatBytes(memUsage.rss),
        total: this.formatBytes(memUsage.rss + memUsage.external),
        percentage: Math.round((memUsage.rss / (memUsage.rss + memUsage.external)) * 100)
      },
      cpu: {
        usage: this.calculateCpuUsage(cpuUsage)
      }
    };
  }
}
```

### Readiness Check

**Endpoint**: `GET /api/v1/health/ready`

Indicates whether the application is ready to serve traffic.

```json
{
  "status": "ready",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "checks": {
    "database": "ready",
    "migrations": "ready",
    "dependencies": "ready"
  }
}
```

### Liveness Check

**Endpoint**: `GET /api/v1/health/live`

Simple check to verify the application is running and responsive.

```json
{
  "status": "alive",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

## Load Balancer Configuration

### AWS Application Load Balancer

```yaml
# ALB Target Group Health Check Configuration
HealthCheckEnabled: true
HealthCheckPath: /api/v1/health
HealthCheckProtocol: HTTP
HealthCheckPort: 3000
HealthCheckIntervalSeconds: 30
HealthCheckTimeoutSeconds: 5
HealthyThresholdCount: 2
UnhealthyThresholdCount: 3
Matcher:
  HttpCode: 200
```

### Nginx Health Checks

```nginx
# nginx.conf
upstream app_servers {
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    
    location /health {
        access_log off;
        proxy_pass http://app_servers/api/v1/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 5s;
        proxy_read_timeout 5s;
    }
    
    location / {
        proxy_pass http://app_servers;
        # ... other proxy settings
    }
}
```

### Docker Health Checks

```dockerfile
# Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Kubernetes Health Checks

```yaml
# kubernetes-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kavach-auth
spec:
  template:
    spec:
      containers:
      - name: app
        image: kavach-auth:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /api/v1/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/v1/health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /api/v1/health/live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
```

## Monitoring Integration

### Prometheus Metrics

```typescript
// src/lib/monitoring/metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const healthCheckDuration = new Histogram({
  name: 'health_check_duration_seconds',
  help: 'Duration of health checks in seconds',
  labelNames: ['check_type', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

export const healthCheckTotal = new Counter({
  name: 'health_check_total',
  help: 'Total number of health checks',
  labelNames: ['check_type', 'status']
});

export const systemResourceGauge = new Gauge({
  name: 'system_resource_usage',
  help: 'System resource usage',
  labelNames: ['resource_type']
});

// Update metrics in health check
export function recordHealthCheck(type: string, status: string, duration: number) {
  healthCheckDuration.labels(type, status).observe(duration);
  healthCheckTotal.labels(type, status).inc();
}
```

### Custom Metrics Endpoint

**Endpoint**: `GET /api/v1/metrics`

```typescript
// src/app/(backend)/api/v1/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { register } from 'prom-client';

export async function GET(request: NextRequest) {
  try {
    const metrics = await register.metrics();
    
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': register.contentType
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Kavach Auth Health Dashboard",
    "panels": [
      {
        "title": "Health Check Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(health_check_total{status=\"healthy\"}[5m]) / rate(health_check_total[5m]) * 100"
          }
        ]
      },
      {
        "title": "Health Check Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(health_check_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "System Resource Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "system_resource_usage{resource_type=\"memory\"}"
          },
          {
            "expr": "system_resource_usage{resource_type=\"cpu\"}"
          }
        ]
      }
    ]
  }
}
```

## External Monitoring Services

### Pingdom Configuration

```bash
# Pingdom HTTP Check
URL: https://auth.yourdomain.com/api/v1/health
Method: GET
Expected Status: 200
Check Interval: 1 minute
Timeout: 30 seconds
Locations: Multiple global locations

# Advanced Settings
String to expect: "healthy"
String should not contain: "unhealthy"
```

### StatusPage Integration

```typescript
// src/lib/monitoring/statuspage.ts
export class StatusPageUpdater {
  private apiKey: string;
  private pageId: string;

  async updateComponentStatus(componentId: string, status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage') {
    const response = await fetch(`https://api.statuspage.io/v1/pages/${this.pageId}/components/${componentId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `OAuth ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        component: { status }
      })
    });

    return response.json();
  }

  async createIncident(name: string, status: string, body: string) {
    const response = await fetch(`https://api.statuspage.io/v1/pages/${this.pageId}/incidents`, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        incident: {
          name,
          status,
          body,
          component_ids: ['component_id_here']
        }
      })
    });

    return response.json();
  }
}
```

### New Relic Synthetic Monitoring

```javascript
// New Relic Synthetic Script
var assert = require('assert');

$http.get('https://auth.yourdomain.com/api/v1/health/detailed', function(err, response, body) {
  assert.equal(response.statusCode, 200, 'Expected 200 status code');
  
  var healthData = JSON.parse(body);
  assert.equal(healthData.status, 'healthy', 'Application should be healthy');
  
  // Check database health
  assert.equal(healthData.checks.database.status, 'healthy', 'Database should be healthy');
  assert(healthData.checks.database.responseTime < 100, 'Database response time should be < 100ms');
  
  // Check Redis health
  assert.equal(healthData.checks.redis.status, 'healthy', 'Redis should be healthy');
  assert(healthData.checks.redis.responseTime < 50, 'Redis response time should be < 50ms');
  
  console.log('All health checks passed');
});
```

## Alerting Configuration

### Prometheus Alerting Rules

```yaml
# alerts.yml
groups:
- name: kavach-auth-health
  rules:
  - alert: ApplicationDown
    expr: up{job="kavach-auth"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Kavach Auth application is down"
      description: "Application has been down for more than 1 minute"

  - alert: HealthCheckFailing
    expr: rate(health_check_total{status="unhealthy"}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Health checks are failing"
      description: "Health check failure rate is {{ $value }} per second"

  - alert: DatabaseHealthCheck
    expr: health_check_duration_seconds{check_type="database"} > 1
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Database health check is slow"
      description: "Database health check taking {{ $value }}s"

  - alert: HighMemoryUsage
    expr: system_resource_usage{resource_type="memory"} > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage detected"
      description: "Memory usage is {{ $value }}%"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourdomain.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
  - match:
      severity: critical
    receiver: 'critical-alerts'
  - match:
      severity: warning
    receiver: 'warning-alerts'

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'http://127.0.0.1:5001/'

- name: 'critical-alerts'
  email_configs:
  - to: 'oncall@yourdomain.com'
    subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      {{ end }}
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#alerts-critical'
    title: 'CRITICAL Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

- name: 'warning-alerts'
  email_configs:
  - to: 'team@yourdomain.com'
    subject: 'WARNING: {{ .GroupLabels.alertname }}'
```

## Health Check Automation

### Automated Health Check Script

```bash
#!/bin/bash
# health-monitor.sh

HEALTH_URL="http://localhost:3000/api/v1/health/detailed"
LOG_FILE="/var/log/health-monitor.log"
ALERT_THRESHOLD=3
FAILURE_COUNT=0

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Perform health check
    RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$HEALTH_URL")
    HTTP_CODE="${RESPONSE: -3}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        # Parse response
        STATUS=$(jq -r '.status' /tmp/health_response.json)
        
        if [ "$STATUS" = "healthy" ]; then
            echo "[$TIMESTAMP] Health check passed" >> "$LOG_FILE"
            FAILURE_COUNT=0
        else
            echo "[$TIMESTAMP] Health check failed: $STATUS" >> "$LOG_FILE"
            ((FAILURE_COUNT++))
        fi
    else
        echo "[$TIMESTAMP] Health check failed: HTTP $HTTP_CODE" >> "$LOG_FILE"
        ((FAILURE_COUNT++))
    fi
    
    # Send alert if threshold reached
    if [ $FAILURE_COUNT -ge $ALERT_THRESHOLD ]; then
        echo "[$TIMESTAMP] ALERT: Health check failed $FAILURE_COUNT times" >> "$LOG_FILE"
        
        # Send notification
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Kavach Auth health check failed $FAILURE_COUNT times\"}" \
            "$SLACK_WEBHOOK_URL"
        
        # Reset counter to avoid spam
        FAILURE_COUNT=0
    fi
    
    # Wait before next check
    sleep 60
done
```

### Systemd Service for Health Monitoring

```ini
# /etc/systemd/system/health-monitor.service
[Unit]
Description=Kavach Auth Health Monitor
After=network.target

[Service]
Type=simple
User=monitor
ExecStart=/usr/local/bin/health-monitor.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Performance Monitoring

### Response Time Tracking

```typescript
// src/lib/monitoring/performance.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private responseTimeHistogram: Histogram<string>;

  constructor() {
    this.responseTimeHistogram = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
    });
  }

  recordResponseTime(method: string, route: string, statusCode: number, duration: number) {
    this.responseTimeHistogram
      .labels(method, route, statusCode.toString())
      .observe(duration);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        this.recordResponseTime(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          duration
        );
      });
      
      next();
    };
  }
}
```

### Database Performance Monitoring

```sql
-- Create monitoring views
CREATE VIEW health_check_metrics AS
SELECT 
    'database_connections' as metric,
    count(*) as value,
    now() as timestamp
FROM pg_stat_activity
UNION ALL
SELECT 
    'database_size' as metric,
    pg_database_size(current_database()) as value,
    now() as timestamp
UNION ALL
SELECT 
    'slow_queries' as metric,
    count(*) as value,
    now() as timestamp
FROM pg_stat_activity 
WHERE state = 'active' 
AND now() - query_start > interval '1 minute';
```

## Troubleshooting Health Checks

### Common Issues

1. **Health Check Timeouts**
   ```bash
   # Check application logs
   tail -f /var/log/app.log | grep health
   
   # Test health endpoint directly
   curl -v http://localhost:3000/api/v1/health
   
   # Check system resources
   top
   free -h
   df -h
   ```

2. **Database Health Check Failures**
   ```bash
   # Test database connectivity
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
   
   # Check database logs
   tail -f /var/log/postgresql/postgresql.log
   
   # Check connection pool
   psql -c "SELECT count(*) FROM pg_stat_activity;"
   ```

3. **Load Balancer Health Check Issues**
   ```bash
   # Check load balancer logs
   aws logs get-log-events --log-group-name /aws/applicationloadbalancer/app/kavach-auth-alb
   
   # Test from load balancer perspective
   curl -H "Host: yourdomain.com" http://internal-alb-address/api/v1/health
   ```

### Debug Mode

```typescript
// Enable detailed health check logging
export const DEBUG_HEALTH_CHECKS = process.env.DEBUG_HEALTH_CHECKS === 'true';

export async function debugHealthCheck() {
  if (!DEBUG_HEALTH_CHECKS) return;
  
  console.log('=== Health Check Debug ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Memory Usage:', process.memoryUsage());
  console.log('CPU Usage:', process.cpuUsage());
  console.log('Uptime:', process.uptime());
  console.log('Environment:', process.env.NODE_ENV);
  console.log('========================');
}
```

## Best Practices

### Health Check Design

1. **Keep checks lightweight** - Health checks should complete quickly
2. **Test critical dependencies** - Include database, cache, and external services
3. **Provide detailed information** - Include response times and error details
4. **Use appropriate timeouts** - Set reasonable timeouts for each check
5. **Implement graceful degradation** - Continue serving traffic when possible

### Monitoring Strategy

1. **Layer your monitoring** - Use multiple monitoring tools and approaches
2. **Set appropriate thresholds** - Avoid alert fatigue with proper thresholds
3. **Monitor trends** - Look for gradual degradation, not just failures
4. **Test your alerts** - Regularly test alert mechanisms
5. **Document procedures** - Maintain runbooks for common issues

### Performance Considerations

1. **Cache health check results** - Avoid overwhelming dependencies
2. **Use circuit breakers** - Prevent cascading failures
3. **Implement backoff strategies** - Reduce load during failures
4. **Monitor check performance** - Ensure checks don't impact application performance

This health monitoring setup provides comprehensive visibility into system health and enables proactive issue resolution.