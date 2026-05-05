import { headers } from 'next/headers';
import Script from 'next/script';
import { ReactNode } from 'react';

/**
 * Get the nonce from middleware headers (server-side only)
 */
export async function getNonce(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    return headersList.get('X-Request-Nonce') || undefined;
  } catch {
    // Headers may not be available in all contexts
    return undefined;
  }
}

/**
 * Synchronous version for client-side usage
 */
export function getNonceSync(): string | undefined {
  if (typeof window !== 'undefined') {
    // On client-side, try to get from global variable set by NonceProvider
    return (window as any).__NEXT_NONCE__;
  }
  return undefined;
}

/**
 * Server component that gets nonce and renders scripts
 */
interface NonceScriptServerProps {
  src?: string;
  children?: string;
  strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';
  [key: string]: any;
}

export async function NonceScriptServer({ src, children, strategy = 'afterInteractive', ...props }: NonceScriptServerProps) {
  const nonce = await getNonce();

  if (src) {
    return (
      <Script
        src={src}
        nonce={nonce}
        strategy={strategy}
        {...props}
      />
    );
  }

  if (children) {
    return (
      <Script
        nonce={nonce}
        strategy={strategy}
        {...props}
      >
        {children}
      </Script>
    );
  }

  return null;
}

/**
 * Client component for scripts (uses sync nonce)
 */
interface NonceScriptProps {
  src?: string;
  children?: string;
  strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';
  [key: string]: any;
}

export function NonceScript({ src, children, strategy = 'afterInteractive', ...props }: NonceScriptProps) {
  const nonce = getNonceSync();

  if (src) {
    return (
      <Script
        src={src}
        nonce={nonce}
        strategy={strategy}
        {...props}
      />
    );
  }

  if (children) {
    return (
      <Script
        nonce={nonce}
        strategy={strategy}
        {...props}
      >
        {children}
      </Script>
    );
  }

  return null;
}

/**
 * Provider component that injects nonce into the page context
 */
interface NonceProviderProps {
  children: ReactNode;
}

export async function NonceProvider({ children }: NonceProviderProps) {
  const nonce = await getNonce();

  return (
    <>
      {nonce && (
        <Script
          id="nonce-provider-inline"  // ✅ Required for inline scripts
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `window.__NEXT_NONCE__ = '${nonce}';`
          }}
        />
      )}
      {children}
    </>
  );
}

/**
 * Inline script component with nonce (server-side)
 */
interface InlineScriptProps {
  children: string;
  id?: string;
}

export async function InlineScript({ children, id }: InlineScriptProps) {
  const nonce = await getNonce();

  return (
    <script
      id={id}
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: children
      }}
    />
  );
}
