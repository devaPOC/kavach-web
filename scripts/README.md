# Interactive Service Request Deletion Script

A single interactive script that allows you to browse, select, and delete service requests with all their related data.

## Features

- **📋 List All Service Requests** - Shows all service requests in the database
- **🎯 Arrow Key Navigation** - Use ↑/↓ arrows to navigate through the list
- **✅ Multi-Selection** - Use SPACE to select/deselect multiple requests
- **🗑️ Safe Deletion** - Deletes service requests and ALL related data
- **🛡️ Transaction Safety** - All deletions are atomic (all or nothing)
- **📊 Detailed Summary** - Shows exactly what was deleted

## What Gets Deleted

When you delete a service request, the following related data is also removed:

- **Service Request Record** - The main service request entry
- **Service Quotes** - All quotes generated for the request
- **Quote Negotiations** - All customer messages, negotiations, and rejection reasons
- **Service Payments** - All payment records associated with the request
- **Completion Reports** - Expert completion reports and file references

## Usage

```bash
# Run the interactive deletion script
npm run delete-service-requests

# Or using bun directly
bun run scripts/interactive-delete-service-requests.ts
```

## How to Use

1. **Start the script** - Run the command above
2. **Browse requests** - Use ↑/↓ arrow keys to navigate
3. **Select requests** - Press SPACE to select/deselect requests for deletion
4. **Delete selected** - Press ENTER to delete all selected requests
5. **Quit anytime** - Press Q to quit without deleting

## Interface

```
🗑️  Interactive Service Request Deletion
========================================

📋 Use ↑/↓ arrows to navigate, SPACE to select/deselect, ENTER to delete selected, Q to quit

▶ ✓ 1. Fix My Laptop Issue
     ID: 123e4567-e89b-12d3-a456-426614174000
     Status: pending | Priority: high
     Service: fix-laptop | Created: 12/15/2023
     Description: My laptop is running very slow and needs optimization...

  ✓ 2. Remove Malware
     ID: 987fcdeb-51a2-43d1-9f6e-123456789abc
     Status: completed | Priority: urgent
     Service: remove-malware | Created: 12/20/2023

    3. General Consultation
     ID: 456def78-9abc-12de-f345-678901234567
     Status: cancelled | Priority: normal
     Service: general-consultation | Created: 12/25/2023

📊 Total: 3 | Selected: 2

⚠️  WARNING: Selected service requests and ALL related data will be permanently deleted!
   This includes: quotes, negotiations, payments, completion reports, etc.
```

## Controls

- **↑/↓ Arrow Keys** - Navigate up/down through the list
- **SPACE** - Select/deselect the current service request
- **ENTER** - Delete all selected service requests
- **Q** - Quit the script
- **Ctrl+C** - Force quit

## Safety Features

- **Visual Confirmation** - Shows exactly what will be deleted
- **Final Confirmation** - Asks "Are you sure?" before deletion
- **Transaction Safety** - All deletions are wrapped in database transactions
- **Error Handling** - Graceful error handling with detailed error messages
- **Rollback Protection** - If any part fails, the entire operation is rolled back

## Example Output

### Selection Phase
```
🗑️  Interactive Service Request Deletion
========================================

📋 Use ↑/↓ arrows to navigate, SPACE to select/deselect, ENTER to delete selected, Q to quit

▶ ✓ 1. Fix My Laptop Issue
     ID: 123e4567-e89b-12d3-a456-426614174000
     Status: pending | Priority: high
     Service: fix-laptop | Created: 12/15/2023

📊 Total: 10 | Selected: 1
```

### Deletion Phase
```
🗑️  Deleting Selected Service Requests
=====================================

About to delete 1 service request(s):
1. Fix My Laptop Issue (123e4567-e89b-12d3-a456-426614174000)

⚠️  WARNING: This action cannot be undone!
This will permanently delete:
- The service request records
- All associated quotes
- All customer messages and negotiations
- All payment records
- All completion reports

Are you sure you want to proceed? (yes/no): yes

⏳ Starting deletion process...

🗑️  Deleting 1/1: Fix My Laptop Issue
✅ Successfully deleted Fix My Laptop Issue

📊 Deletion Summary:
====================
Total Selected: 1
Successfully Deleted: 1
Errors: 0

📈 Detailed deletion counts:
  Service Requests: 1
  Quotes: 2
  Negotiations: 5
  Payments: 1

✅ All selected service requests deleted successfully!
```

## Color Coding

The script uses colors to make information easier to read:

### Status Colors
- **🟡 Yellow** - pending
- **🔵 Cyan** - assigned  
- **🔵 Blue** - in_progress
- **🟢 Green** - completed
- **🔴 Red** - cancelled
- **⚫ Gray** - closed

### Priority Colors
- **🔴 Bright Red** - emergency
- **🔴 Red** - urgent
- **🟡 Yellow** - high
- **🟢 Green** - normal
- **⚫ Gray** - low

## Prerequisites

- Node.js and bun installed
- Database connection configured
- Proper database permissions for DELETE operations

## Security Considerations

- **⚠️ Irreversible** - Deletions cannot be undone
- **🔒 Access Control** - Ensure only authorized personnel run this script
- **💾 Backup First** - Always backup your database before running
- **🧪 Test Environment** - Test in development environment first

## Troubleshooting

### Common Issues

1. **"Database connection failed"**
   - Ensure database is running and accessible
   - Check database connection configuration

2. **"Permission denied"**
   - Verify database user has DELETE permissions
   - Check foreign key constraints

3. **"Arrow keys not working"**
   - Ensure you're running in a proper terminal (not IDE console)
   - Try running directly in terminal/command prompt

### Getting Help

If you encounter issues:
1. Check the console output for specific error messages
2. Ensure all prerequisites are met
3. Test database connection first
4. Run in a proper terminal environment