# Rate Limiting

This document provides comprehensive information about rate limiting in the Kavach API, including limits, headers, error handling, and best practices.

## Overview

Rate limiting is implemented to protect the API from abuse, ensure fair usage, and maintain system stability. Different endpoints have different rate limits based on their security sensitivity and resource requirements.

## Rate Limiting Strategy

The API uses a **sliding window** approach with the following characteristics:

- **IP-based tracking**: Rate limits are applied per IP address
- **Endpoint-specific limits**: Different endpoints have different limits
- **Progressive blocking**: Exceeding limits results in temporary blocks
- **Automatic reset**: Limits reset after the time window expires

## Rate Limit Configuration

### Authentication Endpoints

| Endpoint | Limit | Window | Block Duration | Description |
|----------|-------|--------|----------------|-------------|
| `POST /api/v1/auth/login` | 5 attempts | 15 minutes | 30 minutes | Login attempts |
| `POST /api/v1/auth/signup` | 3 attempts | 1 hour | 1 hour | Account registration |
| `POST /api/v1/auth/verify-email` | 10 attempts | 1 hour | 1 hour | Email verification |
| `POST /api/v1/auth/resend-verification` | 3 attempts | 1 hour | 2 hours | Resend verification |
| `POST /api/v1/admin/login` | 3 attempts | 15 minutes | 1 hour | Admin login (stricter) |

### General API Endpoints

| Endpoint Category | Limit | Window | Description |
|-------------------|-------|--------|-------------|
| Profile operations | 20 requests | 1 minute | Profile CRUD operations |
| User management | 30 requests | 1 minute | User account operations |
| Admin operations | 50 requests | 1 minute | Administrative operations |
| General API calls | 100 requests | 1 minute | Other API endpoints |

## Rate Limit Headers

All API responses include rate limiting headers following the [IETF draft standard](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/):

### Standard Headers

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1642694400
```

- **X-RateLimit-Limit**: Maximum number of requests allowed in the time window
- **X-RateLimit-Remaining**: Number of requests remaining in the current window
- **X-RateLimit-Reset**: Unix timestamp when the rate limit resets

### Additional Headers (When Rate Limited)

```http
Retry-After: 60
X-RateLimit-Blocked-Until: 1642694460
```

- **Retry-After**: Seconds to wait before making another request
- **X-RateLimit-Blocked-Until**: Unix timestamp when the block expires

## Rate Limit Responses

### Successful Request (Within Limits)

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1642694400
Content-Type: application/json

{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Rate Limited Request

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642694400
Retry-After: 60
X-RateLimit-Blocked-Until: 1642694460
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds",
    "details": {
      "retryAfter": 60,
      "blockedUntil": 1642694460
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

### Blocked Request (After Exceeding Limits)

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642694400
Retry-After: 1800
X-RateLimit-Blocked-Until: 1642696200
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many requests. Try again in 1800 seconds",
    "details": {
      "retryAfter": 1800,
      "blockedUntil": 1642696200
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

## Rate Limiting Behavior

### Sliding Window Algorithm

The API uses a sliding window approach:

1. **Request Tracking**: Each request is timestamped and tracked
2. **Window Calculation**: Only requests within the time window are counted
3. **Limit Enforcement**: Requests are blocked when the limit is exceeded
4. **Automatic Reset**: Old requests automatically fall out of the window

### Progressive Blocking

When rate limits are exceeded:

1. **First Violation**: Temporary block for the specified duration
2. **Repeated Violations**: Longer block durations may apply
3. **Automatic Unblock**: Blocks are automatically lifted after the duration
4. **Clean Slate**: Rate limit counters reset after successful unblock

### IP Address Detection

The system detects client IP addresses using:

1. `X-Forwarded-For` header (first IP in chain)
2. `X-Real-IP` header
3. `CF-Connecting-IP` header (Cloudflare)
4. Connection IP as fallback

## Client Implementation

### Checking Rate Limit Status

```javascript
function checkRateLimit(response) {
  const headers = response.headers;
  
  return {
    limit: parseInt(headers.get('X-RateLimit-Limit')),
    remaining: parseInt(headers.get('X-RateLimit-Remaining')),
    resetTime: parseInt(headers.get('X-RateLimit-Reset')),
    retryAfter: parseInt(headers.get('Retry-After')) || null
  };
}
```

### Handling Rate Limited Responses

```javascript
async function makeApiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const rateLimitInfo = checkRateLimit(response);
      const errorData = await response.json();
      
      throw new RateLimitError(errorData.error, rateLimitInfo);
    }
    
    return response;
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Handle rate limiting
      await handleRateLimit(error);
      return makeApiRequest(url, options); // Retry after delay
    }
    throw error;
  }
}
```

### Implementing Retry Logic

```javascript
class RateLimitError extends Error {
  constructor(errorData, rateLimitInfo) {
    super(errorData.message);
    this.code = errorData.code;
    this.retryAfter = errorData.details.retryAfter;
    this.rateLimitInfo = rateLimitInfo;
  }
}

async function handleRateLimit(error) {
  const retryAfter = error.retryAfter * 1000; // Convert to milliseconds
  
  console.log(`Rate limited. Waiting ${error.retryAfter} seconds...`);
  
  // Show user feedback
  showRateLimitMessage(error.retryAfter);
  
  // Wait for the specified time
  await new Promise(resolve => setTimeout(resolve, retryAfter));
  
  // Hide user feedback
  hideRateLimitMessage();
}
```

### Exponential Backoff

```javascript
async function apiCallWithBackoff(apiCall, maxRetries = 3) {
  let attempt = 1;
  
  while (attempt <= maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      if (error instanceof RateLimitError) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Use the server-provided retry time or exponential backoff
        const delay = error.retryAfter 
          ? error.retryAfter * 1000
          : Math.pow(2, attempt) * 1000;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      } else {
        throw error;
      }
    }
  }
}
```

### User Interface Considerations

```javascript
// Show rate limit countdown
function showRateLimitMessage(retryAfter) {
  const messageElement = document.getElementById('rate-limit-message');
  let remainingTime = retryAfter;
  
  const updateMessage = () => {
    messageElement.textContent = 
      `Too many attempts. Please wait ${remainingTime} seconds.`;
    
    if (remainingTime > 0) {
      remainingTime--;
      setTimeout(updateMessage, 1000);
    } else {
      hideRateLimitMessage();
    }
  };
  
  messageElement.style.display = 'block';
  updateMessage();
}

// Disable form submission during rate limit
function disableFormDuringRateLimit(formElement, retryAfter) {
  const submitButton = formElement.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  
  submitButton.disabled = true;
  
  let remainingTime = retryAfter;
  const updateButton = () => {
    submitButton.textContent = `Wait ${remainingTime}s`;
    
    if (remainingTime > 0) {
      remainingTime--;
      setTimeout(updateButton, 1000);
    } else {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  };
  
  updateButton();
}
```

## Server-Side Implementation

### Rate Limit Middleware

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/auth/rate-limiter';

export function withRateLimit(
  config: RateLimitConfig,
  identifier: string
) {
  return function(handler: Function) {
    return async function(request: NextRequest, ...args: any[]) {
      // Check rate limit
      const rateLimitResult = checkRateLimit(request, config, identifier);
      
      if (!rateLimitResult.success) {
        // Create rate limit error response
        const errorResponse = NextResponse.json({
          success: false,
          error: {
            code: rateLimitResult.blocked ? 'TOO_MANY_REQUESTS' : 'RATE_LIMIT_EXCEEDED',
            message: rateLimitResult.blocked 
              ? `Too many requests. Try again in ${rateLimitResult.retryAfter} seconds`
              : `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds`,
            details: {
              retryAfter: rateLimitResult.retryAfter,
              blockedUntil: rateLimitResult.blockedUntil
            }
          },
          timestamp: new Date().toISOString(),
          correlationId: generateCorrelationId()
        }, { status: 429 });
        
        // Add rate limit headers
        const headers = getRateLimitHeaders(rateLimitResult);
        Object.entries(headers).forEach(([key, value]) => {
          errorResponse.headers.set(key, value);
        });
        
        return errorResponse;
      }
      
      // Process the request
      const response = await handler(request, ...args);
      
      // Add rate limit headers to successful responses
      const headers = getRateLimitHeaders(rateLimitResult);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    };
  };
}
```

### Usage Example

```typescript
// Apply rate limiting to login endpoint
export const POST = withRateLimit(
  RATE_LIMIT_CONFIGS.LOGIN,
  'login'
)(async function(request: NextRequest) {
  // Login logic here
  return authController.login(request);
});
```

## Monitoring and Analytics

### Rate Limit Metrics

Track the following metrics:

1. **Request Rates**: Requests per second/minute/hour
2. **Rate Limit Hits**: How often limits are reached
3. **Block Events**: When users are blocked
4. **Recovery Patterns**: How quickly users recover from blocks

### Alerting

Set up alerts for:

- **High Rate Limit Hit Rate**: Indicates potential abuse or UX issues
- **Unusual Traffic Patterns**: Sudden spikes in requests
- **Blocked User Patterns**: Users repeatedly hitting limits
- **System Performance**: Rate limiting impact on response times

### Analytics Queries

```sql
-- Rate limit hit rate by endpoint
SELECT 
  endpoint,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status_code = 429 THEN 1 ELSE 0 END) as rate_limited,
  (SUM(CASE WHEN status_code = 429 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as hit_rate
FROM api_logs 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY endpoint;

-- Top rate limited IPs
SELECT 
  client_ip,
  COUNT(*) as rate_limit_hits,
  MIN(timestamp) as first_hit,
  MAX(timestamp) as last_hit
FROM api_logs 
WHERE status_code = 429 
  AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY client_ip
ORDER BY rate_limit_hits DESC
LIMIT 10;
```

## Best Practices

### For API Clients

1. **Respect Rate Limits**: Always check rate limit headers
2. **Implement Backoff**: Use exponential backoff for retries
3. **Cache Responses**: Reduce unnecessary API calls
4. **Batch Operations**: Combine multiple operations when possible
5. **Monitor Usage**: Track your application's API usage patterns

### For API Providers

1. **Clear Documentation**: Document all rate limits clearly
2. **Appropriate Limits**: Set limits based on actual usage patterns
3. **Graceful Degradation**: Provide meaningful error messages
4. **Monitoring**: Monitor rate limit effectiveness and adjust as needed
5. **Whitelisting**: Consider whitelisting for trusted clients

### User Experience

1. **Progressive Disclosure**: Show rate limit status to users
2. **Clear Messaging**: Explain why limits exist and how to avoid them
3. **Alternative Actions**: Provide alternatives when rate limited
4. **Feedback**: Show countdown timers and progress indicators

## Troubleshooting

### Common Issues

#### High Rate Limit Hit Rate
- **Cause**: Aggressive client behavior or UX issues
- **Solution**: Analyze usage patterns, adjust limits, or improve UX

#### Users Frequently Blocked
- **Cause**: Limits too restrictive or user confusion
- **Solution**: Review limit configuration and user guidance

#### Rate Limiting Not Working
- **Cause**: IP detection issues or configuration problems
- **Solution**: Verify IP detection logic and rate limit configuration

#### Performance Impact
- **Cause**: Rate limiting overhead
- **Solution**: Optimize rate limit storage and checking logic

### Debugging Rate Limits

```javascript
// Debug rate limit headers
function debugRateLimit(response) {
  console.log('Rate Limit Debug:', {
    limit: response.headers.get('X-RateLimit-Limit'),
    remaining: response.headers.get('X-RateLimit-Remaining'),
    reset: new Date(parseInt(response.headers.get('X-RateLimit-Reset')) * 1000),
    retryAfter: response.headers.get('Retry-After'),
    blockedUntil: response.headers.get('X-RateLimit-Blocked-Until') 
      ? new Date(parseInt(response.headers.get('X-RateLimit-Blocked-Until')) * 1000)
      : null
  });
}
```

### Testing Rate Limits

```javascript
// Test rate limiting behavior
async function testRateLimit(endpoint, limit) {
  console.log(`Testing rate limit for ${endpoint} (limit: ${limit})`);
  
  for (let i = 1; i <= limit + 2; i++) {
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const rateLimitInfo = checkRateLimit(response);
      
      console.log(`Request ${i}:`, {
        status: response.status,
        remaining: rateLimitInfo.remaining,
        retryAfter: rateLimitInfo.retryAfter
      });
      
      if (response.status === 429) {
        console.log('Rate limit reached at request', i);
        break;
      }
    } catch (error) {
      console.error(`Request ${i} failed:`, error);
    }
  }
}
```

## Security Considerations

### Rate Limiting as Security

Rate limiting serves as a security measure by:

1. **Preventing Brute Force**: Limiting login attempts
2. **Reducing DoS Impact**: Limiting request volume
3. **Resource Protection**: Preventing resource exhaustion
4. **Cost Control**: Limiting expensive operations

### Advanced Protection

Consider implementing:

1. **CAPTCHA Integration**: For repeated violations
2. **IP Reputation**: Adjust limits based on IP reputation
3. **User Behavior Analysis**: Detect and respond to suspicious patterns
4. **Geographic Restrictions**: Different limits by region
5. **Time-based Adjustments**: Stricter limits during peak hours

### Bypass Prevention

Prevent rate limit bypass through:

1. **Multiple IP Detection**: Handle proxy chains correctly
2. **Session Tracking**: Track authenticated users separately
3. **Fingerprinting**: Use additional client identification methods
4. **Distributed Tracking**: Share rate limit data across servers