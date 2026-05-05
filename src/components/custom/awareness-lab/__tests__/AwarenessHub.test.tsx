import { describe, it, expect, vi } from 'vitest'
import { AwarenessHub } from '../AwarenessHub'

// Mock the store
vi.mock('@/lib/stores/awareness-lab-store', () => ({
  useAwarenessLabStore: vi.fn(),
  useAwarenessLabActions: vi.fn(),
  useAwarenessLabLoading: vi.fn(),
  useAwarenessLabError: vi.fn()
}))

describe('AwarenessHub', () => {
  it('should export AwarenessHub component', () => {
    expect(AwarenessHub).toBeDefined()
    expect(typeof AwarenessHub).toBe('function')
  })

  it('should be a React component', () => {
    // Basic test to ensure the component is properly defined
    const componentName = AwarenessHub.name
    expect(componentName).toBe('AwarenessHub')
  })

  it('should have proper component structure', () => {
    // Test that the component has the expected structure
    const component = AwarenessHub
    expect(component).toBeDefined()
    
    // Verify it's a functional component (not a class)
    expect(component.prototype).toBeUndefined()
  })

  it('should be properly exported from index', async () => {
    // Test that the component is properly exported from the index file
    const { AwarenessHub: ExportedComponent } = await import('../index')
    expect(ExportedComponent).toBe(AwarenessHub)
  })
})