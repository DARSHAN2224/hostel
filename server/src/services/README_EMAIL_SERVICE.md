# Email Service Documentation

## Overview
This email service follows industry-standard patterns for reusable, maintainable, and error-resilient email functionality.

## Architecture

### 1. **Three-Layer Email Architecture**

```
Controller Layer (authController.js)
    ↓
Service Layer (emailService.js) 
    ↓
Utility Layer (email.js)
```

#### **Utility Layer** (`email.js`)
- Low-level email sending functionality
- Handles transporter configuration (Singleton pattern)
- Generic error handling with context logging
- Email type constants and error message mapping

#### **Service Layer** (`emailService.js`)
- Business-specific email functions
- Template integration
- Consistent error handling
- Optional vs critical email distinction

#### **Controller Layer** (`authController.js`)
- Calls appropriate service functions
- Handles business logic
- Manages response to client

---

## Key Design Patterns

### 1. **Separation of Concerns**
Each layer has a single responsibility:
- Utility: Technical email sending
- Service: Business email logic
- Controller: Request/response handling

### 2. **Error Context Propagation**
```javascript
// Utility adds context
throw new Error(`Failed to send ${context} email`)

// Service maps to user-friendly messages
throw new AppError(getEmailErrorMessage(EMAIL_TYPES.VERIFICATION), 500)
```

### 3. **Critical vs Non-Critical Emails**

#### **Critical Emails** (throwOnError = true - default)
- Verification emails
- Password reset emails
- User flow MUST stop if email fails

```javascript
await sendVerificationEmail(email, firstName, code) // Throws on error
```

#### **Non-Critical Emails** (throwOnError = false)
- Password change confirmations
- Welcome emails
- User flow can continue if email fails

```javascript
await sendPasswordChangedEmail(email, firstName) // Returns false on error
```

---

## Usage Examples

### Example 1: Registration (Critical Email)
```javascript
export const register = async (req, res, next) => {
  try {
    // ... create user ...
    
    // This will throw AppError if email fails
    await sendVerificationEmail(email, firstName, verificationCode)
    
    res.status(201).json({
      success: true,
      message: 'Verification code sent to your email'
    })
  } catch (error) {
    next(error) // Global error handler catches it
  }
}
```

### Example 2: Password Change (Non-Critical Email)
```javascript
export const changePassword = async (req, res, next) => {
  try {
    // ... validate and change password ...
    
    // This won't throw - password already changed successfully
    await sendPasswordChangedEmail(user.email, user.firstName)
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    next(error)
  }
}
```

### Example 3: Forgot Password with Cleanup
```javascript
export const forgotPassword = async (req, res, next) => {
  try {
    // ... generate reset token ...
    
    // Critical: Must send email or clean up token
    await sendPasswordResetEmail(user.email, user.firstName, resetURL)
    
    res.json({ success: true, message: 'Reset link sent' })
  } catch (error) {
    // Cleanup: Remove reset token if email failed
    if (error.message?.includes('Failed to send')) {
      user.passwordResetToken = undefined
      user.passwordResetExpires = undefined
      await user.save({ validateBeforeSave: false })
    }
    next(error)
  }
}
```

---

## Benefits of This Approach

### ✅ **1. Reusability**
All email functions are centralized and can be used anywhere:
```javascript
import { sendVerificationEmail } from '../services/emailService.js'
```

### ✅ **2. Consistent Error Messages**
Each email type has a specific user-friendly error message:
```javascript
EMAIL_TYPES.VERIFICATION → "Failed to send verification email..."
EMAIL_TYPES.PASSWORD_RESET → "Failed to send password reset email..."
```

### ✅ **3. Easy Testing**
Each layer can be tested independently:
- Mock the utility layer to test service layer
- Mock the service layer to test controllers

### ✅ **4. Maintainability**
- Change email provider? Update only `email.js`
- Change error messages? Update only `getEmailErrorMessage()`
- Add new email type? Add to service layer only

### ✅ **5. Logging & Debugging**
All emails are logged with context:
```
Email sent successfully - Context: verification, To: user@example.com
Failed to send email - Context: password-reset, To: user@example.com
```

---

## Email Types Reference

| Type | Critical | Throws Error | Use Case |
|------|----------|--------------|----------|
| `VERIFICATION` | ✅ Yes | Yes | Email verification during registration |
| `PASSWORD_RESET` | ✅ Yes | Yes | Forgot password flow |
| `PASSWORD_CHANGED` | ❌ No | No | Confirmation after password change |
| `WELCOME` | ❌ No | No | Welcome message to new users |
| `NOTIFICATION` | ❌ No | No | General notifications |

---

## Configuration

Add to your `.env` file:
```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="Hostel Management <noreply@hostelmanagement.com>"

# Application URLs
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
```

---

## API Endpoints

### Public Routes
```
POST /api/auth/register              - Register with email verification
POST /api/auth/verify-email          - Verify email with code
POST /api/auth/resend-verification   - Resend verification email
POST /api/auth/forgot-password       - Request password reset
POST /api/auth/reset-password        - Reset password with token
```

### Protected Routes
```
PUT /api/auth/change-password        - Change password (sends confirmation)
```

---

## Adding New Email Types

### Step 1: Add to `email.js`
```javascript
export const EMAIL_TYPES = {
  // ... existing types ...
  OUTPASS_APPROVED: 'outpass-approved'
}

export const getEmailErrorMessage = (emailType) => {
  const errorMessages = {
    // ... existing messages ...
    [EMAIL_TYPES.OUTPASS_APPROVED]: 'Failed to send approval notification.'
  }
  return errorMessages[emailType] || 'Failed to send email.'
}
```

### Step 2: Create template in `emailTemplates.js`
```javascript
export const OUTPASS_APPROVED_TEMPLATE = `...`
```

### Step 3: Add service function in `emailService.js`
```javascript
export const sendOutpassApprovedEmail = async (email, firstName, outpassDetails, throwOnError = false) => {
  try {
    const html = OUTPASS_APPROVED_TEMPLATE
      .replace('{username}', firstName)
      .replace('{outpassId}', outpassDetails.id)
    
    await sendEmail({
      to: email,
      subject: 'Outpass Approved - Hostel Management',
      text: `Your outpass request has been approved.`,
      html,
      context: EMAIL_TYPES.OUTPASS_APPROVED
    })
    
    return true
  } catch (error) {
    if (throwOnError) {
      throw new AppError(getEmailErrorMessage(EMAIL_TYPES.OUTPASS_APPROVED), 500)
    }
    return false
  }
}
```

### Step 4: Use in controller
```javascript
import { sendOutpassApprovedEmail } from '../services/emailService.js'

export const approveOutpass = async (req, res, next) => {
  try {
    // ... approve logic ...
    await sendOutpassApprovedEmail(student.email, student.firstName, outpass)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}
```

---

## Best Practices

1. **Always use context** when calling `sendEmail()`
2. **Choose appropriate throwOnError** based on criticality
3. **Clean up side effects** if critical email fails (tokens, flags, etc.)
4. **Log email operations** for debugging
5. **Never expose internal errors** to users (use getEmailErrorMessage)
6. **Test email flow** with both success and failure scenarios
7. **Use environment variables** for all email configuration

---

## Error Handling Flow

```
1. Email fails in utility layer
   ↓
2. Error logged with context
   ↓
3. Service layer catches error
   ↓
4. Service converts to AppError with user-friendly message
   ↓
5. Controller's catch block receives AppError
   ↓
6. Global error handler sends response to client
```

---

## Testing

### Unit Test Example (Service Layer)
```javascript
describe('Email Service', () => {
  it('should send verification email', async () => {
    const result = await sendVerificationEmail('test@example.com', 'John', '123456')
    expect(result).toBe(true)
  })
  
  it('should throw error when verification email fails', async () => {
    // Mock sendEmail to throw error
    await expect(
      sendVerificationEmail('invalid@example.com', 'John', '123456')
    ).rejects.toThrow('Failed to send verification email')
  })
})
```

---

## Troubleshooting

### Email not sending?
1. Check `.env` configuration
2. Verify email credentials
3. Check logger output for errors
4. Ensure EMAIL_SERVICE matches your provider
5. For Gmail: Enable "Less secure app access" or use App Password

### Wrong error message?
1. Check EMAIL_TYPES constant matches
2. Verify getEmailErrorMessage() mapping
3. Ensure context is passed correctly

### Emails working but user not receiving?
1. Check spam folder
2. Verify email address is correct
3. Check email provider logs
4. Test with different email provider

---

## Migration from Old Pattern

### Before (❌ Anti-pattern)
```javascript
await sendEmail({
  to: email,
  subject: '...',
  errorCallback: (error) => {
    console.error('Error:', error)
  }
})
```

### After (✅ Standard pattern)
```javascript
await sendVerificationEmail(email, firstName, code)
```

The new pattern:
- ✅ Cleaner and more readable
- ✅ Consistent error handling
- ✅ Reusable across codebase
- ✅ Proper error propagation
- ✅ Context-aware logging
