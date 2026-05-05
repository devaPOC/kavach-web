# Force Delete Development Script

This script allows you to bypass business logic restrictions and force delete quizzes or learning modules that have existing attempts or progress records.

## ⚠️ Important Safety Notes

- **DEVELOPMENT ONLY**: This script is designed for development purposes only
- **DESTRUCTIVE**: All deletions are permanent and cannot be undone
- **DATABASE SAFETY**: By default, only works with local databases (localhost/127.0.0.1)
- **PRODUCTION PROTECTION**: Cannot be run in production environment

## Usage

### Interactive Mode (Recommended)

The easiest way to use this script is with interactive mode:

```bash
# Interactive selection with arrow keys
bun run scripts/force-delete-dev.ts --force-unsafe
```

This will:

1. Show a menu to select between quizzes and learning modules
2. Display a list of all available items with titles and metadata
3. Allow you to navigate with arrow keys (↑/↓)
4. Show a preview of what would be deleted
5. Ask for explicit confirmation before deleting

### Direct Mode (Legacy)

```bash
# Show what would be deleted (dry run)
bun run scripts/force-delete-dev.ts quiz <quiz-id>
bun run scripts/force-delete-dev.ts module <module-id>

# Actually delete (with confirmation)
bun run scripts/force-delete-dev.ts quiz <quiz-id> --confirm
bun run scripts/force-delete-dev.ts module <module-id> --confirm

# Force operation on non-local database (DANGEROUS!)
bun run scripts/force-delete-dev.ts quiz <quiz-id> --confirm --force-unsafe
```

### Example: Solving Your Error

The error you encountered:

```text
Cannot delete quiz with existing attempts (QUIZ_HAS_ATTEMPTS)
```

Can now be resolved easily with interactive mode:

```bash
# Run interactive mode
bun run scripts/force-delete-dev.ts --force-unsafe

# Then use arrow keys to:
# 1. Select "Delete Quiz" from the main menu
# 2. Navigate to your quiz in the list
# 3. Press ENTER to select it
# 4. Review what will be deleted
# 5. Type "DELETE" to confirm
```

Or with the direct approach:

```bash
# First, see what would be deleted
bun run scripts/force-delete-dev.ts quiz 78aca222-f808-4117-b64f-6c91cc38fe96 --force-unsafe

# Then actually delete it
bun run scripts/force-delete-dev.ts quiz 78aca222-f808-4117-b64f-6c91cc38fe96 --confirm --force-unsafe
```

## What Gets Deleted

### For Quizzes

- The quiz record
- All quiz questions (cascade delete)
- All quiz attempts from all users

### For Learning Modules

- The learning module record
- All module materials (cascade delete)
- All user progress records for the module

## Safety Features

1. **Environment Check**: Won't run in production
2. **Database Check**: Only works with local/dev databases unless `--force-unsafe`
3. **Dry Run Default**: Always shows what would be deleted before doing it
4. **Explicit Confirmation**: Requires `--confirm` flag for actual deletion
5. **Clear Output**: Shows exactly what data will be affected

## Flags

- `--confirm`: Actually perform the deletion (without this, it's just a dry run)
- `--force-unsafe`: Bypass database safety checks (use with extreme caution)

## Use Cases

- Removing test data during development
- Cleaning up after failed tests
- Resolving business logic restrictions during development
- Testing deletion workflows

Remember: Always run without `--confirm` first to see what would be deleted!
