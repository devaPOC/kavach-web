// Test script for account locking functionality
// This validates the core logic without complex dependencies

import { beforeEach, describe, it, expect } from 'vitest';

// Mock types and interfaces for testing
interface User {
  id: string;
  email: string;
  isLocked: boolean;
  lockedAt?: Date;
  lockReason?: string;
}

interface RequestContext {
  correlationId: string;
  clientIP: string;
  userAgent: string;
  timestamp: Date;
  requestId: string;
  method: string;
  url: string;
}

// Simple account locking service for testing
class TestAccountLockingService {
  private users: Map<string, User> = new Map();
  private loginFailures: Map<string, number> = new Map();

  constructor() {
    // Add test user
    this.users.set('test@example.com', {
      id: 'user-1',
      email: 'test@example.com',
      isLocked: false
    });
  }

  async lockAccount(userId: string, reason: string): Promise<boolean> {
    const user = this.getUserById(userId);
    if (!user) return false;

    user.isLocked = true;
    user.lockedAt = new Date();
    user.lockReason = reason;

    return true;
  }

  async unlockAccount(userId: string): Promise<boolean> {
    const user = this.getUserById(userId);
    if (!user) return false;

    user.isLocked = false;
    user.lockedAt = undefined;
    user.lockReason = undefined;

    return true;
  }

  async login(email: string, password: string, context: RequestContext): Promise<{ success: boolean; user?: User; message?: string }> {
    const user = this.getUserByEmail(email);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Check if account is locked
    if (user.isLocked) {
      return {
        success: false,
        message: `Account is locked: ${user.lockReason || 'Security violation'}`
      };
    }

    // Simulate password check (in real implementation, this would be hashed)
    if (password !== 'correct-password') {
      const failures = (this.loginFailures.get(email) || 0) + 1;
      this.loginFailures.set(email, failures);

      // Auto-lock after 5 failures
      if (failures >= 5) {
        await this.lockAccount(user.id, `Excessive login failures (${failures} attempts)`);
        return {
          success: false,
          message: 'Account locked due to excessive failed login attempts'
        };
      }

      return { success: false, message: 'Invalid credentials' };
    }

    // Reset failures on successful login
    this.loginFailures.delete(email);
    return { success: true, user };
  }

  private getUserById(id: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.id === id) return user;
    }
    return undefined;
  }

  private getUserByEmail(email: string): User | undefined {
    return this.users.get(email);
  }
}

describe('Account Locking Functionality', () => {
  let service: TestAccountLockingService;
  let mockContext: RequestContext;

  beforeEach(() => {
    service = new TestAccountLockingService();
    mockContext = {
      correlationId: 'test-123',
      clientIP: '192.168.1.1',
      userAgent: 'Test Agent',
      timestamp: new Date(),
      requestId: 'req-123',
      method: 'POST',
      url: '/api/auth/login'
    };
  });

  describe('Manual Account Locking', () => {
    it('should lock account manually', async () => {
      const result = await service.lockAccount('user-1', 'Security investigation');
      expect(result).toBe(true);

      const loginResult = await service.login('test@example.com', 'correct-password', mockContext);
      expect(loginResult.success).toBe(false);
      expect(loginResult.message).toContain('Account is locked');
    });

    it('should unlock account manually', async () => {
      // First lock the account
      await service.lockAccount('user-1', 'Test lock');

      // Then unlock it
      const result = await service.unlockAccount('user-1');
      expect(result).toBe(true);

      // Should be able to login again
      const loginResult = await service.login('test@example.com', 'correct-password', mockContext);
      expect(loginResult.success).toBe(true);
    });
  });

  describe('Automatic Account Locking', () => {
    it('should lock account after excessive failed login attempts', async () => {
      // Try to login with wrong password 5 times
      for (let i = 0; i < 5; i++) {
        const result = await service.login('test@example.com', 'wrong-password', mockContext);
        expect(result.success).toBe(false);

        if (i < 4) {
          expect(result.message).toBe('Invalid credentials');
        } else {
          expect(result.message).toBe('Account locked due to excessive failed login attempts');
        }
      }

      // Even with correct password, login should fail now
      const correctPasswordResult = await service.login('test@example.com', 'correct-password', mockContext);
      expect(correctPasswordResult.success).toBe(false);
      expect(correctPasswordResult.message).toContain('Account is locked');
    });

    it('should reset failure count on successful login', async () => {
      // Try wrong password a few times
      await service.login('test@example.com', 'wrong-password', mockContext);
      await service.login('test@example.com', 'wrong-password', mockContext);

      // Then login successfully
      const successResult = await service.login('test@example.com', 'correct-password', mockContext);
      expect(successResult.success).toBe(true);

      // Should be able to attempt login again without immediate locking
      const wrongPasswordResult = await service.login('test@example.com', 'wrong-password', mockContext);
      expect(wrongPasswordResult.success).toBe(false);
      expect(wrongPasswordResult.message).toBe('Invalid credentials');
    });
  });

  describe('Locked Account Behavior', () => {
    it('should prevent login when account is locked', async () => {
      await service.lockAccount('user-1', 'Admin decision');

      const result = await service.login('test@example.com', 'correct-password', mockContext);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Account is locked: Admin decision');
    });

    it('should handle non-existent user gracefully', async () => {
      const lockResult = await service.lockAccount('non-existent', 'Test');
      expect(lockResult).toBe(false);

      const unlockResult = await service.unlockAccount('non-existent');
      expect(unlockResult).toBe(false);
    });
  });
});
