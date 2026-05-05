# Content Security Policy (CSP) Configuration

## Current Issue

Your application was encountering CSP violations because Next.js generates inline scripts during hydration that don't have the required nonce attribute. This is a common issue with strict CSP implementations in Next.js applications.

## Solution Implemented

### 1. **Temporary Fix - Report-Only Mode**

- CSP is now set to "report-only" mode on Vercel deployments
- This means violations are logged but don't block script execution
- Scripts will continue to work while you debug the issues

### 2. **Nonce Provider System**

- Created `/src/lib/security/nonce-provider.tsx` to handle nonces properly
- Added `NonceProvider` to your root layout
- This makes nonces available throughout your app

### 3. **Hash Allowlist**

- Added all the specific script hashes from your error messages to the CSP
- These hashes correspond to Next.js internal scripts that need to run

### 4. **Environment-Based Configuration**

- Development: More permissive CSP with `unsafe-eval` and `unsafe-inline`
- Production: Strict CSP with specific hash allowances
- Vercel: Report-only mode to prevent blocking

## Files Modified

1. **`src/lib/auth/middleware-utils.ts`**
   - Enhanced CSP generation with hash allowances
   - Added report-only mode for Vercel
   - Added development vs production configurations

2. **`src/app/layout.tsx`**
   - Added NonceProvider wrapper
   - This ensures nonces are available to child components

3. **`next.config.ts`**
   - Added development-specific CSP headers
   - Configured experimental features for better CSP support

4. **`vercel.json`** (new)
   - Added environment variable to disable strict CSP
   - Added function timeout configurations

5. **`src/lib/security/nonce-provider.tsx`** (new)
   - Created nonce utility functions
   - Added Script components with automatic nonce injection

## Next Steps

### For Immediate Deployment

The current configuration should resolve the CSP errors. The CSP is in report-only mode, so scripts will execute normally.

### For Production Hardening

1. **Monitor CSP Reports**: Check your browser developer tools or configure CSP reporting endpoint
2. **Gradually Enforce**: Change from report-only to enforcement mode once all violations are resolved
3. **Update Hashes**: If Next.js updates and generates new script hashes, add them to the allowlist

### Environment Variables

You can control CSP behavior with these environment variables:

```env
# Disable strict CSP (useful for debugging)
CSP_DISABLE_STRICT=1

# Environment detection (automatically set by platforms)
NODE_ENV=production
VERCEL=1
```

## Testing CSP

To test CSP enforcement:

1. **Enable Enforcement Mode**:

   ```typescript
   // In middleware-utils.ts, change:
   const headerName = 'Content-Security-Policy'; // Force enforcement
   ```

2. **Check Browser Console**: Look for CSP violation reports
3. **Monitor Network Tab**: Verify scripts are loading correctly

## Common CSP Issues

1. **Inline Scripts**: Use `NonceScript` component instead of regular `<script>` tags
2. **Third-party Scripts**: Add their domains to `script-src` directive
3. **Eval Usage**: Some libraries require `unsafe-eval` (e.g., development tools)
4. **Hash Mismatches**: Next.js updates can change script hashes

## Security Considerations

- Report-only mode is less secure but allows gradual CSP implementation
- Always test CSP changes in staging before production
- Monitor for new violation patterns after Next.js updates
- Consider using CSP reporting endpoint for production monitoring

## Debugging Commands

```bash
# Test local build with production CSP
npm run build && npm run start

# Check CSP headers
curl -I http://localhost:3000 | grep -i csp

# View CSP violations in browser
# Open DevTools > Console > Filter by "CSP"
```
