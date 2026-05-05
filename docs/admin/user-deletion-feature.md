# User Deletion with Email Notification Feature

## Overview

The enhanced user deletion feature allows administrators to delete user accounts with a mandatory reason and automatically sends a professional email notification to the deleted user. This feature ensures transparency, compliance, and maintains good user relations even during account terminations.

## Features

### ✅ Core Functionality
- **Admin-only access**: Only authenticated administrators can delete users
- **Self-protection**: Admins cannot delete their own accounts
- **Reason requirement**: Deletion reason can be provided for transparency
- **Email notification**: Automatic email sent to the deleted user
- **Session invalidation**: All user sessions are immediately terminated
- **Audit logging**: Complete audit trail for compliance

### 📧 Email Notification
- **Professional template**: Clean, branded HTML and text email formats
- **Detailed information**: Includes deletion reason, timestamp, and support contact
- **Support guidance**: Clear instructions for appeals or questions
- **Responsive design**: Works well on all devices and email clients

## API Usage

### Endpoint
```
DELETE /api/v1/admin/users/{userId}
```

### Headers
```
Content-Type: application/json
Cookie: auth-session=<admin-session-token>
```

### Request Body (Optional)
```json
{
  "reason": "Detailed reason for account deletion"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "message": "User deleted successfully and notification email sent."
  },
  "timestamp": "2025-01-31T10:30:00.000Z",
  "correlationId": "req-123456"
}
```

### Error Responses
```json
{
  "success": false,
  "error": "User not found.",
  "code": "INVALID_CREDENTIALS",
  "timestamp": "2025-01-31T10:30:00.000Z",
  "correlationId": "req-123456"
}
```

## Frontend Integration

### React Component Example
```tsx
import { DeleteUserDialog } from '@/components/custom/admin/DeleteUserDialog';

function AdminUserManagement() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteUser = async (reason: string) => {
    const response = await fetch(`/api/v1/admin/users/${selectedUser.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    
    if (response.ok) {
      // Refresh user list
      await refreshUsers();
      setShowDeleteDialog(false);
    }
  };

  return (
    <div>
      {/* User list with delete buttons */}
      <DeleteUserDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteUser}
        user={selectedUser}
      />
    </div>
  );
}
```

### JavaScript/Fetch Example
```javascript
async function deleteUser(userId, reason) {
  try {
    const response = await fetch(`/api/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }

    const result = await response.json();
    console.log('User deleted:', result.data.message);
    return result;
  } catch (error) {
    console.error('Delete user error:', error);
    throw error;
  }
}
```

## Email Template

### Subject
```
Account Deletion Notification - Kavach
```

### Content Includes
- **Header**: Professional Kavach branding
- **Notification**: Clear account deletion message
- **Details**: User name, deletion date, and status
- **Reason**: Admin-provided deletion reason
- **Warning**: Data permanence notice
- **Support**: Contact information for appeals
- **Footer**: Legal and branding information

### Email Preview
```
Dear John Doe,

We are writing to inform you that your Kavach account has been 
permanently deleted from our platform. This action was taken by 
our administration team and cannot be undone.

DELETION DETAILS:
- Account: John Doe
- Deleted On: January 31, 2025 at 10:30 AM
- Status: Permanently Deleted

REASON FOR DELETION:
Account violated community guidelines by posting inappropriate 
content and failing to respond to warnings.

IMPORTANT: All your account data has been permanently removed 
and cannot be recovered.

If you believe this action was taken in error, please contact 
our support team at support@kavach.com
```

## Security & Compliance

### Access Control
- ✅ Admin authentication required
- ✅ Role-based authorization (admin only)
- ✅ Self-deletion prevention
- ✅ Session validation

### Audit Trail
- ✅ Complete deletion logging
- ✅ Admin identification
- ✅ Timestamp recording
- ✅ Reason documentation
- ✅ Correlation ID tracking

### Data Protection
- ✅ Immediate session invalidation
- ✅ Complete data removal
- ✅ Email notification for transparency
- ✅ Support contact provision

## Testing

### Manual Testing
1. **Setup**: Ensure admin account and test user exist
2. **Authentication**: Login as admin
3. **API Call**: Send DELETE request with reason
4. **Verification**: Check user deletion and email delivery
5. **Cleanup**: Verify all user data removed

### Test Script
```bash
# Run the test script
npm run test:user-deletion

# Or with tsx directly
npx tsx scripts/test-user-deletion.ts
```

### Email Testing
The system includes email service testing:
- SMTP connection verification
- Template rendering validation
- Delivery confirmation
- Error handling testing

## Configuration

### Environment Variables
```env
# Email Service (required for notifications)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@kavach.com
EMAIL_PASS=your-email-password
SMTP_FROM="Kavach <noreply@kavach.com>"

# Application URLs
NEXT_PUBLIC_APP_URL=https://kavach.com
```

### Email Service Setup
1. Configure SMTP settings in environment
2. Test email connection: `emailService.testConnection()`
3. Verify template rendering
4. Test delivery to real email addresses

## Error Handling

### Common Errors
- **401 Unauthorized**: Admin authentication required
- **403 Forbidden**: Insufficient permissions or self-deletion attempt
- **404 Not Found**: User does not exist
- **400 Bad Request**: Invalid request format
- **500 Internal Server Error**: System error

### Email Delivery Failures
- Deletion proceeds even if email fails
- Email errors are logged but don't block deletion
- Admin receives success confirmation regardless
- Support team can manually notify user if needed

## Best Practices

### For Administrators
1. **Always provide clear reasons**: Help users understand the decision
2. **Be professional**: Reasons will be sent to users via email
3. **Document thoroughly**: Include policy violations or specific incidents
4. **Follow up**: Monitor support channels for user appeals

### For Developers
1. **Validate input**: Ensure reason is provided and meaningful
2. **Handle errors gracefully**: Don't fail deletion due to email issues
3. **Log everything**: Maintain complete audit trails
4. **Test thoroughly**: Verify both deletion and email functionality

## Monitoring & Analytics

### Metrics to Track
- Number of user deletions per day/week/month
- Deletion reasons categorization
- Email delivery success rates
- Support ticket volume post-deletion
- Admin activity patterns

### Logging
All deletion activities are logged with:
- Admin user ID and email
- Deleted user information
- Deletion timestamp
- Provided reason
- Email delivery status
- Correlation ID for tracing

## Support & Troubleshooting

### Common Issues
1. **Email not delivered**: Check SMTP configuration and logs
2. **Permission denied**: Verify admin role and session validity
3. **User not found**: Confirm user ID exists in database
4. **Self-deletion blocked**: Admins cannot delete their own accounts

### Debug Steps
1. Check server logs for detailed error messages
2. Verify email service configuration
3. Test SMTP connection manually
4. Validate admin session and permissions
5. Confirm user existence in database

### Support Contacts
- **Technical Issues**: dev-team@kavach.com
- **User Appeals**: support@kavach.com
- **Policy Questions**: admin@kavach.com

---

*This feature was implemented to improve transparency and user experience during account terminations while maintaining security and compliance requirements.*