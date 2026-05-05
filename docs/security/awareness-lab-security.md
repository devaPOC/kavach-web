# Awareness Lab Security Implementation

This document describes the comprehensive security measures implemented for the Awareness Lab feature, including server-side validation, CSP headers, audit logging, rate limiting, and session validation.

## Overview

The Awareness Lab security implementation provides multiple layers of protection against various attack vectors including:

- Quiz submission manipulation and cheating
- External content injection attacks
- Rate limiting abuse
- Session hijacking
- Content Security Policy violations
- Malicious external links

## Security Components

### 1. Server-Side Quiz Validation

#### QuizSubmissionValidator

The `QuizSubmissionValidator` class provides comprehensive validation of quiz submissions to prevent cheating and ensure data integrity.

**Key Features:**

- **Timing Validation**: Ensures quiz completion times are within reasonable bounds
- **Answer Format Validation**: Validates answer structure based on question types
- **Attempt Integrity**: Verifies attempt ownership and state
- **Suspicious Pattern Detection**: Identifies potential cheating behaviors

**Validation Checks:**

```typescript
// Time validation
- Negative time values
- Time limit exceeded
- Suspiciously fast completion
- Server-client time discrepancy

// Answer validation
- Answer format by question type (MCQ, True/False, Multiple Select)
- Answer content length limits
- Valid answer options

// Pattern detection
- Sequential answer patterns (A, B, C, D...)
- Identical answers across all questions
- Suspiciously fast completion times
```

**Usage Example:**

```typescript
const validationResult = quizSubmissionValidator.validateSubmission(
  answers,
  timeTakenSeconds,
  quizData,
  attemptData,
  userId,
  requestId
);

if (!validationResult.isValid) {
  // Handle validation failure
  console.log('Validation errors:', validationResult.errors);
}

if (validationResult.warnings.length > 0) {
  // Log suspicious activity
  console.log('Security warnings:', validationResult.warnings);
}
```

### 2. Content Security Policy (CSP)

#### AwarenessLabCSPManager

Manages CSP headers for different types of content and pages within the Awareness Lab.

**CSP Configurations:**

1. **Quiz Pages (Restrictive)**:

   ```
   script-src 'self' 'nonce-{nonce}'
   frame-src 'none'
   object-src 'none'
   media-src 'none'
   ```

2. **Learning Materials (Permissive)**:

   ```
   script-src 'self' 'nonce-{nonce}' https://www.youtube.com https://player.vimeo.com
   frame-src 'self' https://*.youtube.com https://*.vimeo.com https://docs.google.com
   media-src 'self' https://*.youtube.com https://*.vimeo.com
   ```

3. **Admin Pages (Balanced)**:

   ```
   script-src 'self' 'nonce-{nonce}'
   frame-src 'self' https://*.youtube.com https://*.vimeo.com
   img-src 'self' data: blob: https://*.youtube.com https://*.vimeo.com
   ```

**Allowed External Domains:**

- `youtube.com` and `youtu.be` (video content)
- `vimeo.com` (video content)
- `docs.google.com` (documents)
- `drive.google.com` (documents)
- `office.com` and `microsoft.com` (documents)

### 3. External Link Validation

#### ExternalLinkValidator

Validates and sanitizes external URLs used in learning materials.

**Validation Process:**

1. **Protocol Check**: Only HTTPS and HTTP allowed
2. **Domain Whitelist**: Checks against approved domains
3. **Suspicious Pattern Detection**: Identifies potentially malicious URLs
4. **URL Sanitization**: Removes dangerous parameters

**Blocked Patterns:**

```typescript
const suspiciousPatterns = [
  /javascript:/i,
  /data:/i,
  /vbscript:/i,
  /<script/i,
  /onclick/i,
  /onerror/i,
  /onload/i
];
```

### 4. Rate Limiting

#### AwarenessLabRateLimiter

Implements specific rate limits for different Awareness Lab operations.

**Rate Limit Configurations:**

| Operation | Window | Max Attempts | Block Duration |
|-----------|--------|--------------|----------------|
| Quiz Attempts | 1 hour | 20 | 30 minutes |
| Quiz Submissions | 5 minutes | 10 | 15 minutes |
| Learning Material Access | 1 hour | 100 | 10 minutes |
| Admin Quiz Creation | 1 hour | 50 | 1 hour |

**Usage:**

```typescript
const rateLimitResult = AwarenessLabRateLimiter.checkQuizSubmissionLimit(request);
if (!rateLimitResult.success) {
  // Handle rate limit exceeded
  return createRateLimitResponse(rateLimitResult);
}
```

### 5. Session Validation

#### QuizSessionValidator

Validates user sessions for quiz attempts to prevent session hijacking and ensure session integrity.

**Validation Checks:**

- Session ownership verification
- Session freshness (age validation)
- Session data integrity
- User role validation

### 6. Audit Logging

Comprehensive audit logging for all security-related events.

**Logged Events:**

```typescript
// Quiz Events
'awareness.quiz.attempt.started'
'awareness.quiz.attempt.submitted'
'awareness.quiz.attempt.completed'
'awareness.quiz.validation.failed'
'awareness.quiz.validation.suspicious'
'awareness.quiz.session.invalid'

// Security Events
'awareness.security.alert'
'awareness.rate.limit.exceeded'
'awareness.csp.violation'
'awareness.external.link.blocked'

// Admin Events
'awareness.quiz.created'
'awareness.quiz.updated'
'awareness.quiz.deleted'
```

**Audit Log Format:**

```json
{
  "event": "awareness.quiz.validation.failed",
  "userId": "user123",
  "requestId": "req_456",
  "severity": "high",
  "success": false,
  "timestamp": "2025-09-15T12:00:00.000Z",
  "metadata": {
    "errors": ["Time limit exceeded"],
    "securityScore": 25,
    "quizId": "quiz789"
  }
}
```

## Security Middleware

### AwarenessLabSecurityMiddleware

Provides unified security middleware for all Awareness Lab endpoints.

**Middleware Functions:**

1. **secureQuizAttempt()**: For quiz attempt endpoints
2. **secureQuizSubmission()**: For quiz submission endpoints
3. **secureLearningMaterial()**: For learning material endpoints
4. **secureAdminEndpoint()**: For admin management endpoints

**Security Flow:**

```
Request → Rate Limiting → Session Validation → Content Validation → Handler → CSP Headers → Audit Logging → Response
```

## Implementation Examples

### 1. Securing Quiz Submission Endpoint

```typescript
export async function PUT(request: NextRequest, context: RouteHandlerContext) {
  return awarenessLabSecurityMiddleware.secureQuizSubmission(
    request,
    async (req) => {
      // Your quiz submission handler
      return awarenessLabController.submitQuizAttempt(req, attemptId);
    },
    {
      answers: body.answers,
      timeTakenSeconds: body.timeTakenSeconds,
      quizData: quiz,
      attemptData: attempt,
      userId: session.userId
    }
  );
}
```

### 2. Securing Learning Material Endpoint

```typescript
export async function GET(request: NextRequest) {
  const externalUrls = extractExternalUrls(learningMaterials);

  return awarenessLabSecurityMiddleware.secureLearningMaterial(
    request,
    async (req) => {
      // Your learning material handler
      return learningController.getLearningMaterials(req);
    },
    externalUrls
  );
}
```

### 3. Adding CSP Headers

```typescript
// In your route handler
const response = await handler(request);
const nonce = generateNonce();

awarenessLabCSPManager.addCSPHeaders(
  response,
  request.nextUrl.pathname,
  nonce,
  additionalExternalSources
);

return response;
```

## Security Configuration

### Environment Variables

```bash
# Security settings
NODE_ENV=production
CSP_DISABLE_STRICT=false
DISABLE_RATE_LIMITING=false
AUDIT_LOG_LEVEL=info

# Rate limiting
AWARENESS_LAB_RATE_LIMIT_ENABLED=true
AWARENESS_LAB_STRICT_MODE=true
```

### Middleware Configuration

```typescript
// In middleware-config.ts
rateLimiting: {
  enabled: true,
  endpoints: [
    '/api/v1/quizzes/',
    '/api/v1/admin/quizzes/',
    '/api/v1/learning-modules/'
  ]
}
```

## Security Best Practices

### 1. Quiz Security

- **Always validate on server-side**: Never trust client-side validation alone
- **Implement time limits**: Enforce strict time limits with server-side validation
- **Monitor suspicious patterns**: Log and investigate unusual submission patterns
- **Use secure sessions**: Validate session integrity for each quiz attempt

### 2. Content Security

- **Whitelist external domains**: Only allow trusted external content sources
- **Sanitize URLs**: Remove potentially dangerous parameters from external links
- **Use CSP headers**: Implement appropriate CSP policies for different page types
- **Validate content types**: Ensure external content matches expected types

### 3. Rate Limiting

- **Different limits for different operations**: Use appropriate limits based on operation sensitivity
- **Progressive penalties**: Increase block duration for repeated violations
- **Monitor rate limit violations**: Track and investigate excessive rate limit hits

### 4. Audit Logging

- **Log all security events**: Comprehensive logging for security analysis
- **Include context**: Provide sufficient metadata for investigation
- **Protect log integrity**: Ensure audit logs cannot be tampered with
- **Regular monitoring**: Set up alerts for critical security events

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Quiz Validation Failures**: High failure rates may indicate attack attempts
2. **Rate Limit Violations**: Excessive violations may indicate abuse
3. **CSP Violations**: Unexpected violations may indicate XSS attempts
4. **Suspicious Patterns**: Monitor for cheating behavior patterns
5. **External Link Blocks**: Track blocked malicious URLs

### Alert Thresholds

- **Critical**: Multiple validation failures from same user/IP
- **High**: CSP violations with script injection attempts
- **Medium**: Rate limit violations exceeding normal patterns
- **Low**: External link validation warnings

## Testing

The security implementation includes comprehensive tests covering:

- Quiz submission validation scenarios
- External link validation and sanitization
- CSP header generation and validation
- Rate limiting functionality
- Security middleware integration
- Audit logging verification

Run security tests:

```bash
npm test -- --run src/test/awareness-lab-security.test.ts
```

## Compliance and Standards

This implementation follows security best practices including:

- **OWASP Top 10**: Protection against common web vulnerabilities
- **Content Security Policy Level 3**: Modern CSP implementation
- **Rate Limiting Standards**: RFC-compliant rate limiting headers
- **Audit Logging**: Structured logging for security analysis
- **Input Validation**: Comprehensive server-side validation

## Troubleshooting

### Common Issues

1. **CSP Violations**: Check allowed domains and nonce implementation
2. **Rate Limit False Positives**: Adjust limits based on usage patterns
3. **Validation Failures**: Review validation logic for edge cases
4. **External Link Blocks**: Verify domain whitelist configuration

### Debug Mode

Enable debug logging:

```bash
AUDIT_LOG_LEVEL=debug
MIDDLEWARE_LOG_LEVEL=debug
```

This will provide detailed logging for troubleshooting security issues.
