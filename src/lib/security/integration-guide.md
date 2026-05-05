# Security and Performance Optimizations Integration Guide

This document provides guidance on how to integrate and use the comprehensive security and performance optimizations implemented for the Awareness Lab system.

## Overview

The security and performance optimizations consist of three main components:

1. **Security Enhancements** - Input sanitization, URL validation, and embed code security
2. **Performance Optimizations** - Lazy loading, query optimization, and caching
3. **Security Monitoring** - Intrusion detection, rate limiting, and audit logging

## Security Enhancements

### Input Sanitization

```typescript
import { htmlSanitizer, urlValidator, embedCodeValidator } from '@/lib/security/input-sanitizer';

// Sanitize HTML content
const result = htmlSanitizer.sanitizeHTML(userInput, userId, requestId);
if (result.errors.length > 0) {
  throw new Error(`Sanitization failed: ${result.errors.join(', ')}`);
}

// Validate URLs
const urlResult = urlValidator.validateURL(url, userId, requestId);
if (!urlResult.isValid) {
  throw new Error(`Invalid URL: ${urlResult.errors.join(', ')}`);
}

// Validate embed codes
const embedResult = embedCodeValidator.validateEmbedCode(embedCode, userId, requestId);
if (!embedResult.isValid) {
  throw new Error(`Invalid embed code: ${embedResult.errors.join(', ')}`);
}
```

### Security Middleware

```typescript
import { securityMiddleware, createSecurityContext, applySecurityHeaders } from '@/lib/security/security-middleware';

// In API route handler
export async function POST(request: NextRequest) {
  const context = createSecurityContext(request, userId);
  
  // Apply security middleware
  const { response, continue: shouldContinue } = await securityMiddleware.applySecurityMiddleware(request, context);
  
  if (!shouldContinue) {
    return response; // Request blocked by security middleware
  }
  
  // Validate request data
  const validationResult = await securityMiddleware.validateRequestData(
    await request.json(),
    context,
    {
      fields: {
        title: { type: 'text', required: true, maxLength: 200 },
        description: { type: 'html', required: false },
        videoUrl: { type: 'url', required: false }
      }
    }
  );
  
  if (!validationResult.isValid) {
    return NextResponse.json({ error: 'Validation failed', details: validationResult.errors }, { status: 400 });
  }
  
  // Process request with sanitized data
  const result = await processRequest(validationResult.sanitizedData);
  
  // Apply security headers to response
  const response = NextResponse.json(result);
  return applySecurityHeaders(response);
}
```

## Performance Optimizations

### Lazy Loading Components

```typescript
import { LazyComponent, LazyImage, LazyVideo, useIntersectionObserver } from '@/lib/performance/lazy-loading';

// Lazy load components
function QuizList() {
  return (
    <LazyComponent
      fallback={<QuizListSkeleton />}
      options={{ threshold: 0.1, rootMargin: '100px' }}
    >
      <ExpensiveQuizList />
    </LazyComponent>
  );
}

// Lazy load images
function MaterialImage({ src, alt }: { src: string; alt: string }) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      placeholder="Loading..."
      onLoad={() => console.log('Image loaded')}
      onError={(error) => console.error('Image failed to load', error)}
    />
  );
}

// Custom lazy loading hook
function CustomLazyComponent() {
  const [ref, isVisible] = useIntersectionObserver({
    threshold: 0.5,
    triggerOnce: true
  });
  
  return (
    <div ref={ref}>
      {isVisible ? <ExpensiveComponent /> : <Skeleton />}
    </div>
  );
}
```

### Query Optimization

```typescript
import { queryBuilder, queryMonitor } from '@/lib/performance/query-optimizer';

// Execute optimized queries with monitoring
async function getQuizWithStats(quizId: string, userId?: string) {
  const queryId = createId();
  
  return await queryBuilder.executeWithMonitoring(
    async () => {
      // Your database query here
      return await db.query.quizzes.findFirst({
        where: eq(quizzes.id, quizId),
        with: {
          questions: true,
          attempts: {
            where: userId ? eq(quizAttempts.userId, userId) : undefined
          }
        }
      });
    },
    queryId,
    'SELECT quiz with questions and attempts',
    userId,
    '/api/v1/awareness-lab/quiz'
  );
}

// Get performance metrics
const metrics = queryMonitor.getMetrics();
const slowQueries = queryMonitor.getSlowQueries();
```

### Caching

```typescript
import { cacheManager, AWARENESS_LAB_CACHE_STRATEGIES } from '@/lib/performance/cache-manager';

// Cache quiz data
async function getCachedQuiz(quizId: string) {
  return await cacheManager.getOrSet(
    `quiz:${quizId}`,
    async () => {
      return await fetchQuizFromDatabase(quizId);
    },
    AWARENESS_LAB_CACHE_STRATEGIES.QUIZ_DETAIL(quizId)
  );
}

// Invalidate cache
await cacheManager.clear('quiz:*'); // Clear all quiz cache
await cacheManager.invalidateByTags(['quiz', 'user']); // Invalidate by tags
```

## Security Monitoring

### Security Monitor Integration

```typescript
import { securityMonitor, SecurityEventType } from '@/lib/security/security-monitor';

// Monitor requests
async function monitorQuizSubmission(request: NextRequest, userId: string) {
  const result = await securityMonitor.monitorRequest(request, {
    userId,
    sessionId: getSessionId(request),
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    payload: await request.json(),
    metadata: {
      quizId: 'quiz-123',
      attemptNumber: 3
    }
  });
  
  if (result.blocked) {
    return NextResponse.json(
      { error: 'Request blocked for security reasons' },
      { status: 403 }
    );
  }
  
  // Process the request
  return processQuizSubmission(result.event.payload);
}

// Get security metrics
const metrics = securityMonitor.getSecurityMetrics({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  end: new Date()
});
```

### Enhanced Rate Limiting

```typescript
import { checkEnhancedRateLimit, ENHANCED_RATE_LIMIT_CONFIGS } from '@/lib/security/enhanced-rate-limiter';

// Apply rate limiting to API endpoints
export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimitResult = await checkEnhancedRateLimit(
    request,
    ENHANCED_RATE_LIMIT_CONFIGS.QUIZ_SUBMISSION,
    `quiz-submission:${userId}`
  );
  
  if (!rateLimitResult.success) {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: rateLimitResult.userFriendlyMessage,
        retryAfter: rateLimitResult.retryAfter
      },
      { status: 429 }
    );
    
    // Add rate limit headers
    if (rateLimitResult.headers) {
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }
    
    return response;
  }
  
  // Process the request
  const result = await processRequest();
  
  // Add rate limit headers to successful response
  const response = NextResponse.json(result);
  if (rateLimitResult.headers) {
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}
```

## Integration Examples

### Complete API Route with All Optimizations

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware, createSecurityContext } from '@/lib/security/security-middleware';
import { checkEnhancedRateLimit, ENHANCED_RATE_LIMIT_CONFIGS } from '@/lib/security/enhanced-rate-limiter';
import { cacheManager, AWARENESS_LAB_CACHE_STRATEGIES } from '@/lib/performance/cache-manager';
import { queryBuilder } from '@/lib/performance/query-optimizer';
import { createId } from '@paralleldrive/cuid2';

export async function POST(request: NextRequest) {
  const requestId = createId();
  const userId = await getUserIdFromSession(request);
  
  try {
    // 1. Apply rate limiting
    const rateLimitResult = await checkEnhancedRateLimit(
      request,
      ENHANCED_RATE_LIMIT_CONFIGS.QUIZ_ATTEMPT,
      `quiz-attempt:${userId || 'anonymous'}`
    );
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.userFriendlyMessage },
        { status: 429, headers: rateLimitResult.headers }
      );
    }
    
    // 2. Apply security middleware
    const context = createSecurityContext(request, userId);
    const { response, continue: shouldContinue } = await securityMiddleware.applySecurityMiddleware(request, context);
    
    if (!shouldContinue) {
      return response;
    }
    
    // 3. Validate and sanitize input
    const requestData = await request.json();
    const validationResult = await securityMiddleware.validateRequestData(
      requestData,
      context,
      {
        fields: {
          quizId: { type: 'text', required: true },
          answers: { type: 'text', required: true }
        }
      }
    );
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.errors },
        { status: 400 }
      );
    }
    
    // 4. Check cache first
    const cacheKey = `quiz-attempt:${userId}:${validationResult.sanitizedData.quizId}`;
    const cachedResult = await cacheManager.get(cacheKey);
    
    if (cachedResult) {
      return NextResponse.json(cachedResult, { headers: rateLimitResult.headers });
    }
    
    // 5. Execute optimized database query
    const result = await queryBuilder.executeWithMonitoring(
      async () => {
        return await processQuizAttempt(validationResult.sanitizedData);
      },
      requestId,
      'Process quiz attempt',
      userId,
      request.nextUrl.pathname
    );
    
    // 6. Cache the result
    await cacheManager.set(
      cacheKey,
      result,
      AWARENESS_LAB_CACHE_STRATEGIES.USER_PROGRESS(userId || 'anonymous')
    );
    
    // 7. Return response with security headers
    const response = NextResponse.json(result, { headers: rateLimitResult.headers });
    return securityMiddleware.applySecurityHeaders(response);
    
  } catch (error) {
    logger.error('API request failed', { requestId, error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Frontend Component with Performance Optimizations

```typescript
import React, { Suspense } from 'react';
import { LazyComponent, LazyImage } from '@/lib/performance/lazy-loading';

// Lazy load the quiz component
const QuizComponent = React.lazy(() => import('./QuizComponent'));

function AwarenessLabDashboard() {
  return (
    <div className="awareness-lab-dashboard">
      
      {/* Lazy load quiz list */}
      <LazyComponent
        fallback={<QuizListSkeleton />}
        options={{
          threshold: 0.1,
          rootMargin: '200px' // Load earlier on slow connections
        }}
      >
        <Suspense fallback={<QuizListSkeleton />}>
          <QuizComponent />
        </Suspense>
      </LazyComponent>
      
      {/* Lazy load images with different strategies based on connection */}
      <div className="learning-materials">
        {materials.map((material) => (
          <LazyImage
            key={material.id}
            src={isSlowConnection ? material.thumbnailUrl : material.imageUrl}
            alt={material.title}
            placeholder={<MaterialSkeleton />}
            onLoad={() => trackImageLoad(material.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

## Monitoring and Maintenance

### Performance Monitoring

```typescript
import { queryMonitor } from '@/lib/performance/query-optimizer';
import { cacheManager } from '@/lib/performance/cache-manager';
import { lazyLoadingMonitor } from '@/lib/performance/lazy-loading';

// Get performance metrics
function getPerformanceReport() {
  return {
    database: {
      totalQueries: queryMonitor.getMetrics().length,
      slowQueries: queryMonitor.getSlowQueries().length,
      averageExecutionTime: queryMonitor.getAverageExecutionTimeByEndpoint()
    },
    cache: {
      stats: cacheManager.getStats(),
      hitRate: calculateHitRate(cacheManager.getStats())
    },
    lazyLoading: {
      metrics: lazyLoadingMonitor.getMetrics(),
      averageLoadTime: calculateAverageLoadTime(lazyLoadingMonitor.getMetrics())
    }
  };
}
```

### Security Monitoring

```typescript
import { securityMonitor } from '@/lib/security/security-monitor';
import { EnhancedRateLimitMonitor } from '@/lib/security/enhanced-rate-limiter';

// Get security report
function getSecurityReport() {
  return {
    events: securityMonitor.getSecurityMetrics(),
    rateLimit: {
      stats: EnhancedRateLimitMonitor.getStats(),
      topViolators: EnhancedRateLimitMonitor.getTopViolators(),
      blockedKeys: EnhancedRateLimitMonitor.getBlockedKeys()
    }
  };
}
```

## Best Practices

1. **Always validate and sanitize user input** before processing
2. **Use caching strategically** - cache expensive operations but invalidate appropriately
3. **Monitor performance metrics** regularly and optimize slow queries
4. **Implement progressive loading** for better user experience
5. **Set up proper rate limiting** for all public endpoints
6. **Monitor security events** and respond to threats quickly
7. **Use lazy loading** for non-critical content
8. **Implement proper error handling** and fallbacks
9. **Test security measures** regularly
10. **Keep dependencies updated** for security patches

## Configuration

All components can be configured through environment variables and configuration objects. See individual component documentation for specific configuration options.

## Troubleshooting

Common issues and solutions:

1. **High memory usage**: Check cache configuration and cleanup intervals
2. **Slow queries**: Review database indexes and query optimization
3. **False positive security alerts**: Adjust security rule thresholds
4. **Rate limiting too aggressive**: Review rate limit configurations
5. **Lazy loading not working**: Check intersection observer support and fallbacks