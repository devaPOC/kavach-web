// Token revocation store - memory-based implementation
// Uses in-memory Set for token revocation tracking

const memoryRevoked = new Set<string>();

export async function revokeJti(jti: string, ttlSeconds: number = 60 * 60 * 24 * 31) {
  memoryRevoked.add(jti);
}

export async function isJtiRevokedAsync(jti?: string | null): Promise<boolean> {
  if (!jti) return false;
  return memoryRevoked.has(jti);
}

// Synchronous check for existing code paths
export function isJtiRevoked(jti?: string | null): boolean {
  if (!jti) return false;
  return memoryRevoked.has(jti);
}

export function clearRevoked() { memoryRevoked.clear(); }
