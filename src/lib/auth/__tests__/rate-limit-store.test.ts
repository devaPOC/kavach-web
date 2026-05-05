import { describe, it, expect } from 'vitest';
import { createRateLimitStore, RateLimitEntry } from '../rate-limit-store';

describe('RateLimitStore (memory)', () => {
  it('should set and get entries', () => {
    const store = createRateLimitStore();
    const entry: RateLimitEntry = { attempts: 1, resetTime: Date.now() + 1000 };
    store.set('k', entry);
    expect(store.get('k')).toEqual(entry);
  });

  it('should delete entries', () => {
    const store = createRateLimitStore();
    const entry: RateLimitEntry = { attempts: 2, resetTime: Date.now() + 1000 };
    store.set('k', entry);
    store.delete('k');
    expect(store.get('k')).toBeUndefined();
  });
});
