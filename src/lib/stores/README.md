# Awareness Lab Stores

This directory contains Zustand stores for managing the Awareness Lab feature state. The stores are designed to work seamlessly with the existing authentication system and provide comprehensive state management for both customer and admin functionality.

## Store Architecture

### Customer Store (`awareness-lab-store.ts`)
Manages customer-facing functionality including:
- Quiz taking and navigation
- Timer management with auto-submit
- Learning materials progress tracking
- User progress persistence

### Admin Store (`admin-awareness-store.ts`)
Manages admin-specific operations including:
- Quiz and template CRUD operations
- Learning materials management
- Analytics and reporting
- Bulk operations and publishing

### Integration (`awareness-lab-integration.ts`)
Provides hooks for:
- Authentication integration
- Permission checking
- Timer persistence across page refreshes
- Progress synchronization
- Offline/online state handling

## Quick Start

### Basic Customer Usage

```tsx
import { useAwarenessLabApp, useQuizzes, useAwarenessLabActions } from '@/lib/stores';

function QuizComponent() {
  // Initialize the awareness lab integration
  useAwarenessLabApp();
  
  // Get quizzes and actions
  const quizzes = useQuizzes();
  const actions = useAwarenessLabActions();
  
  // Load quizzes on mount
  useEffect(() => {
    actions.fetchQuizzes();
  }, [actions]);
  
  return (
    <div>
      {quizzes.map(quiz => (
        <button key={quiz.id} onClick={() => actions.startQuiz(quiz.id)}>
          {quiz.title}
        </button>
      ))}
    </div>
  );
}
```

### Basic Admin Usage

```tsx
import { useAdminQuizzes, useAdminAwarenessActions } from '@/lib/stores';

function AdminQuizManager() {
  const adminQuizzes = useAdminQuizzes();
  const actions = useAdminAwarenessActions();
  
  useEffect(() => {
    actions.fetchAdminQuizzes();
  }, [actions]);
  
  const createQuiz = async () => {
    await actions.createQuiz({
      title: 'New Quiz',
      language: 'en',
      timeLimitMinutes: 30,
      maxAttempts: 3,
      questions: []
    });
  };
  
  return (
    <div>
      <button onClick={createQuiz}>Create Quiz</button>
      {adminQuizzes.map(quiz => (
        <div key={quiz.id}>{quiz.title}</div>
      ))}
    </div>
  );
}
```

## Store Features

### Timer Management
- Automatic countdown with visual updates
- Auto-submit when time expires
- Pause/resume functionality
- Persistence across page refreshes

```tsx
const quizTimer = useQuizTimer();
const actions = useAwarenessLabActions();

// Start a 30-minute timer
actions.startTimer(30);

// Timer automatically counts down and submits quiz when it reaches 0
```

### Progress Tracking
- Real-time progress updates
- Persistent storage across sessions
- Automatic synchronization with server

```tsx
const userProgress = useUserProgress();
const actions = useAwarenessLabActions();

// Mark material as complete
await actions.markMaterialComplete('module-id', 'material-id');

// Check progress
const isCompleted = userProgress['module-id-material-id']?.isCompleted;
```

### Error Handling
- Centralized error state management
- User-friendly error messages
- Automatic retry mechanisms

```tsx
const error = useAwarenessLabError();
const actions = useAwarenessLabActions();

if (error) {
  return (
    <div>
      <p>Error: {error}</p>
      <button onClick={actions.clearError}>Dismiss</button>
    </div>
  );
}
```

## Integration Hooks

### `useAwarenessLabApp()`
Main integration hook that should be used in your app root or layout component. It handles:
- Store initialization based on user authentication
- Timer persistence across page refreshes
- Progress synchronization
- Offline/online state management

### `useAwarenessLabPermissions()`
Provides permission checking functionality:

```tsx
const { checkPermissions } = useAwarenessLabPermissions();

const permissions = await checkPermissions();
if (permissions.canTakeQuizzes) {
  // Show quiz interface
}
```

### `useQuizTimerPersistence()`
Handles timer state persistence across page refreshes. Automatically restores timer state if user refreshes during a quiz.

### `useProgressSync()`
Manages progress synchronization with the server. Automatically syncs progress every 30 seconds and on page unload.

## Selector Hooks

For better performance, use selector hooks instead of accessing the full store:

```tsx
// Good - only re-renders when quizzes change
const quizzes = useQuizzes();

// Less optimal - re-renders on any store change
const { quizzes } = useAwarenessLabStore();
```

Available selector hooks:
- `useQuizzes()`
- `useCurrentQuiz()`
- `useCurrentAttempt()`
- `useQuizTimer()`
- `useLearningModules()`
- `useCurrentModule()`
- `useUserProgress()`
- `useAwarenessLabActions()`
- `useAwarenessLabLoading()`
- `useAwarenessLabError()`

## Admin Selector Hooks

- `useAdminQuizzes()`
- `useQuizTemplates()`
- `useSelectedQuiz()`
- `useAdminModules()`
- `useSelectedModule()`
- `useAnalytics()`
- `useAdminAwarenessActions()`
- `useAdminAwarenessLoading()`
- `useAdminAwarenessError()`

## State Persistence

The stores use Zustand's persist middleware to maintain state across browser sessions:

### Customer Store Persistence
- User progress data
- Active tab preference
- Quiz attempt history

### Admin Store Persistence
- Active admin tab preference
- UI preferences

Sensitive data like current quiz attempts and timer state are not persisted for security reasons.

## Testing

The stores include comprehensive test coverage. Run tests with:

```bash
npm test src/lib/stores/__tests__/
```

Test files:
- `awareness-lab-store.test.ts` - Customer store tests
- `admin-awareness-store.test.ts` - Admin store tests

## API Integration

The stores are designed to work with the following API endpoints:

### Customer Endpoints
- `GET /api/v1/quizzes` - Fetch available quizzes
- `GET /api/v1/quizzes/:id` - Fetch quiz details
- `POST /api/v1/quizzes/:id/attempts` - Start quiz attempt
- `PUT /api/v1/quizzes/attempts/:id/submit` - Submit quiz
- `GET /api/v1/learning-modules` - Fetch learning modules
- `POST /api/v1/learning-modules/:id/progress` - Update progress

### Admin Endpoints
- `GET /api/v1/admin/quizzes` - Fetch admin quizzes
- `POST /api/v1/admin/quizzes` - Create quiz
- `PUT /api/v1/admin/quizzes/:id` - Update quiz
- `DELETE /api/v1/admin/quizzes/:id` - Delete quiz
- `GET /api/v1/admin/quiz-templates` - Fetch templates
- `GET /api/v1/admin/analytics/overview` - Fetch analytics

## Best Practices

1. **Use Integration Hooks**: Always use `useAwarenessLabApp()` in your main app component
2. **Use Selector Hooks**: Prefer selector hooks over full store access for better performance
3. **Handle Loading States**: Always check loading and error states in your components
4. **Clean Up Timers**: The stores handle timer cleanup automatically, but be aware of the lifecycle
5. **Permission Checking**: Use `useAwarenessLabPermissions()` to check user permissions before showing UI
6. **Error Handling**: Implement proper error handling and user feedback

## Examples

See `examples/awareness-lab-usage-example.tsx` for complete working examples of:
- Customer quiz taking interface
- Admin quiz management
- Timer functionality
- Error handling patterns