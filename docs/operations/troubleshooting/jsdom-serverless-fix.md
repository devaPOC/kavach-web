# jsdom Configuration Fix for Serverless Environments

## Issue

When running in serverless environments (like Vercel/AWS Lambda), the application encountered the following error during quiz creation:

```
ENOENT: no such file or directory, open '/var/task/.next/browser/default-stylesheet.css'
```

## Root Cause

The error originated from the `isomorphic-dompurify` package, which uses `jsdom` under the hood. When `jsdom` initializes in a Node.js environment, it attempts to load external resources like CSS files. In serverless environments:

1. The path `/var/task/.next/browser/default-stylesheet.css` refers to Next.js build artifacts
2. This file doesn't exist or isn't accessible in the Lambda execution environment
3. jsdom's default behavior is to attempt loading these resources
4. File system access fails, causing the error

## Solution

Created a centralized jsdom configuration utility (`src/lib/utils/jsdom-config.ts`) that:

1. Configures jsdom's `ResourceLoader` to skip loading external resources
2. Overrides the `fetch` method to return `null` for all resource requests
3. Sets `JSDOM_RESOURCE_LOADER='skip'` environment variable
4. Provides a `getDOMPurify()` helper that ensures proper configuration before returning DOMPurify

## Implementation

### Affected Files

All files using `isomorphic-dompurify` were updated to use the centralized helper:

- `src/lib/validation/awareness-lab-utils.ts` - HTML sanitization
- `src/lib/security/input-sanitizer.ts` - Input sanitization (2 locations)
- `src/lib/services/awareness-lab/material-validation.service.ts` - Embed code & content sanitization (2 locations)

### Usage Pattern

**Before:**

```typescript
const DOMPurify = require('isomorphic-dompurify');
const clean = DOMPurify.sanitize(html);
```

**After:**

```typescript
import { getDOMPurify } from '@/lib/utils/jsdom-config';

const DOMPurify = getDOMPurify();
const clean = DOMPurify.sanitize(html);
```

## Why This Works

1. **Resource Loading Prevention**: By overriding `ResourceLoader.fetch()`, we prevent jsdom from attempting to load any external resources (CSS, images, scripts)
2. **One-time Configuration**: The configuration is applied once globally and cached
3. **No Breaking Changes**: DOMPurify functionality remains unchanged - only the initialization is modified
4. **Serverless-Safe**: Works in both local development and serverless production environments

## Testing

To verify the fix:

1. Create a quiz through the admin panel
2. Check server logs - no ENOENT errors should appear
3. Quiz creation should complete successfully
4. HTML sanitization should work as expected

## Related Error Patterns

If you encounter similar errors with other libraries that use jsdom:

```
ENOENT: no such file or directory, open '/var/task/.next/...'
```

The same configuration pattern can be applied: configure jsdom to skip resource loading before the library initializes.

## References

- jsdom documentation: <https://github.com/jsdom/jsdom#custom-resource-loader>
- isomorphic-dompurify: Uses jsdom for server-side DOM parsing
- Vercel Lambda environment: `/var/task/` is the Lambda working directory

## Date

Fixed: 2025-12-20
