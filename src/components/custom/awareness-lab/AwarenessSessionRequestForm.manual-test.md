# AwarenessSessionRequestForm Manual Testing Guide

## Overview
This document provides a manual testing guide for the AwarenessSessionRequestForm component.

## Test Cases

### 1. Form Rendering
- [ ] Form renders with correct initial step (Session Details)
- [ ] Progress indicator shows 3 steps with step 1 active
- [ ] All required fields are visible in step 1
- [ ] Form validation messages appear for empty required fields

### 2. Step 1: Session Details
- [ ] Session Date & Time field accepts future dates only
- [ ] Location field accepts text input
- [ ] Duration dropdown shows all options (1 Hour, 2 Hours, Half Day, Full Day)
- [ ] Subject/Topic field accepts text input
- [ ] Next button is disabled until all required fields are filled
- [ ] Next button becomes enabled when all fields are valid

### 3. Step 2: Audience Information
- [ ] Audience Size field accepts numeric input only
- [ ] Audience Types shows all checkboxes (Women, Kids, Adults, Mixed, Corporate Staff, Students)
- [ ] At least one audience type must be selected
- [ ] Session Mode dropdown shows On-site and Online options
- [ ] Previous button navigates back to step 1
- [ ] Next button is disabled until all required fields are filled

### 4. Step 3: Organization & Contact
- [ ] Organization Name field accepts text input
- [ ] Contact Email field validates email format
- [ ] Contact Phone field accepts phone number input
- [ ] Special Requirements field is optional and accepts long text
- [ ] Previous button navigates back to step 2
- [ ] Submit button is disabled until all required fields are filled
- [ ] Submit button shows loading state when submitting

### 5. Form Submission
- [ ] Form calls onSubmit with correct data structure
- [ ] sessionDate is converted from string to Date object
- [ ] All form data is properly formatted
- [ ] Form shows loading state during submission
- [ ] Error messages are displayed if submission fails

### 6. Validation
- [ ] Real-time validation works on all fields
- [ ] Error messages are clear and helpful
- [ ] Form prevents submission with invalid data
- [ ] Date validation prevents past dates
- [ ] Email validation works correctly
- [ ] Required field validation works on all steps

## Test Data

### Valid Test Data
```javascript
{
  sessionDate: new Date('2024-12-31T10:00:00'),
  location: 'Conference Room A, Main Building',
  duration: '2_hours',
  subject: 'Phishing Awareness and Email Security',
  audienceSize: 25,
  audienceTypes: ['corporate_staff', 'adults'],
  sessionMode: 'on_site',
  specialRequirements: 'Projector and microphone needed',
  organizationName: 'Acme Corporation',
  contactEmail: 'john.doe@acme.com',
  contactPhone: '+1-555-123-4567'
}
```

### Invalid Test Cases
- Past date for sessionDate
- Empty required fields
- Invalid email format
- Zero or negative audience size
- No audience types selected

## Navigation Test
1. Start at step 1
2. Fill all required fields
3. Click Next → Should go to step 2
4. Click Previous → Should go back to step 1
5. Fill step 1 again and go to step 2
6. Fill all required fields in step 2
7. Click Next → Should go to step 3
8. Click Previous → Should go back to step 2
9. Navigate to step 3 and fill all fields
10. Click Submit → Should call onSubmit with formatted data

## Accessibility Test
- [ ] All form fields have proper labels
- [ ] Form is keyboard navigable
- [ ] Error messages are announced by screen readers
- [ ] Focus management works correctly between steps
- [ ] Color contrast is sufficient for all text

## Responsive Design Test
- [ ] Form works on mobile devices
- [ ] Form works on tablet devices
- [ ] Form works on desktop devices
- [ ] Progress indicator adapts to screen size
- [ ] Form fields stack properly on small screens