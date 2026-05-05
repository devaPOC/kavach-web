import type { NextRequest } from 'next/server';

// Shared interface for storing rate limit counters
export interface RateLimitEntry {
  attempts: number;
  resetTime: number; // epoch ms when window resets
  blockedUntil?: number; // epoch ms when block lifts
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | undefined> | RateLimitEntry | undefined;
  set(key: string, entry: RateLimitEntry): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  cleanup?(now?: number): Promise<void> | void;
}

class MemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  constructor(private autoCleanup = true) {
    if (autoCleanup) {
      setInterval(() => this.cleanup?.(), 5 * 60 * 1000).unref?.();
    }
  }
  get(key: string) { return this.store.get(key); }
  set(key: string, entry: RateLimitEntry) { this.store.set(key, entry); }
  delete(key: string) { this.store.delete(key); }
  cleanup(now: number = Date.now()) {
    const entries = Array.from(this.store.entries());
    for (const [k, v] of entries) {
      if (v.resetTime < now && (!v.blockedUntil || v.blockedUntil < now)) this.store.delete(k);
    }
  }
}

export function createRateLimitStore(): RateLimitStore {
  return new MemoryStore();
}

export const defaultRateLimitStore: RateLimitStore = createRateLimitStore();

// Utility for tests to build a mock NextRequest-like object
export function buildMockRequest(headers: Record<string, string | undefined> = {}): NextRequest {
  const h = new Headers();
  Object.entries(headers).forEach(([k, v]) => { if (v !== undefined) h.set(k, v); });
  return { headers: h } as unknown as NextRequest;
}
