# User Safety and Demo Data Cleanup Guide

## Overview
This document explains the user safety features and demo data cleanup procedures implemented to protect real user data and remove demo/test data.

## 🛡️ User Safety Features

### 1. 3-Step Confirmation for User Deletion
All user deletions now require **3 confirmations** before proceeding:

#### For Self-Deletion (`/api/users/me`):
1. **Step 1**: `POST /api/users/me/request-deletion`
   - Requires password (for non-Google users)
   - Sets `deletionConfirmationCount = 1`
   - Returns: `"This is confirmation 1 of 3"`

2. **Step 2**: `POST /api/users/me/confirm-deletion`
   - Requires confirmation text: `DELETE {user.email}`
   - Increments to `deletionConfirmationCount = 2`
   - Returns: `"This is confirmation 2 of 3"`

3. **Step 3**: `POST /api/users/me/confirm-deletion` (again)
   - Requires confirmation text: `DELETE {user.email}`
   - Sets `deletionConfirmationCount = 3`
   - **Soft deletes** the user (sets `deletedAt` and `isActive = false`)

#### For Admin Deletion (`/api/admin/users/:id`):
1. **Step 1**: `POST /api/admin/users/:id/request-deletion`
   - Sets `deletionConfirmationCount = 1`
   - Returns: `"This is confirmation 1 of 3"`

2. **Step 2**: `POST /api/admin/users/:id/confirm-deletion`
   - Requires confirmation text: `DELETE {user.email}`
   - Increments to `deletionConfirmationCount = 2`
   - Returns: `"This is confirmation 2 of 3"`

3. **Step 3**: `POST /api/admin/users/:id/confirm-deletion` (again)
   - Requires confirmation text: `DELETE {user.email}`
   - Sets `deletionConfirmationCount = 3`
   - **Soft deletes** the user

### 2. Soft Deletion
- Users are **never permanently deleted** from the database
- Instead, they are marked with `deletedAt` timestamp
- `isActive` is set to `false`
- Deleted users are excluded from all queries by default

### 3. Cancel Deletion Request
- Users/admins can cancel deletion requests:
  - `POST /api/users/me/cancel-deletion`
  - `POST /api/admin/users/:id/cancel-deletion`
- Resets `deletionConfirmationCount` and `deletionRequestedAt`

### 4. Demo Users Exception
- Demo users (`john@example.com`, `jane@example.com`, `mike@example.com`) can be deleted immediately without confirmation
- This allows easy cleanup of test data

## 🗑️ Demo Data Cleanup

### Remove Demo Users
Run the script to remove all demo users and their associated data:

```bash
cd backend
node src/scripts/removeDemoUsers.js
```

This script will:
- Remove demo users: `john@example.com`, `jane@example.com`, `mike@example.com`
- Delete all associated:
  - Chat rooms and messages
  - Purchases/orders
  - Notifications
  - Subscriptions

### Remove Demo Products
Demo products have already been removed from the codebase. If any remain in the database:

```bash
cd backend
node src/scripts/removeDemoProducts.js
```

## 🔍 Finding Deleted Google Users

If a Google user was accidentally deleted, you can find and restore them:

### 1. Find Deleted Google Users
```bash
cd backend
node src/scripts/findDeletedGoogleUsers.js
```

This will list all deleted Google users with their:
- Name and email
- Google ID
- Deletion date
- Creation date

### 2. Restore a Deleted Google User
```bash
cd backend
node src/scripts/findDeletedGoogleUsers.js RESTORE {GOOGLE_ID}
```

Replace `{GOOGLE_ID}` with the actual Google ID from the list above.

Example:
```bash
node src/scripts/findDeletedGoogleUsers.js RESTORE google-user-1763701866678
```

## 📋 Database Schema Changes

### User Model Updates
Added fields to `User` model:
- `deletedAt`: Date when user was deleted (null if not deleted)
- `deletionConfirmationCount`: Number of confirmations (0-3)
- `deletionRequestedAt`: Timestamp when deletion was first requested

### Query Helpers
Added query helpers to User model:
- `.notDeleted()`: Exclude deleted users
- `.active()`: Include only active, non-deleted users

## 🔒 Protection Mechanisms

1. **Authentication Middleware**: Excludes deleted users from authentication
2. **User Queries**: All user queries exclude deleted users by default
3. **3-Step Confirmation**: Prevents accidental deletions
4. **Soft Deletion**: Allows recovery of deleted users
5. **Confirmation Text**: Requires exact email match for deletion

## ⚠️ Important Notes

1. **Never permanently delete real users** - Always use soft deletion
2. **Always ask 3 times** before deleting any real user account
3. **Demo users** can be deleted immediately for cleanup
4. **Deleted users** are automatically excluded from all queries
5. **Google users** can be restored if accidentally deleted

## 🚀 Usage Examples

### Self-Delete Account (3 Steps)
```javascript
// Step 1
POST /api/users/me/request-deletion
Body: { password: "userpassword" }

// Step 2
POST /api/users/me/confirm-deletion
Body: { confirmationText: "DELETE user@example.com" }

// Step 3
POST /api/users/me/confirm-deletion
Body: { confirmationText: "DELETE user@example.com" }
```

### Admin Delete User (3 Steps)
```javascript
// Step 1
POST /api/admin/users/{userId}/request-deletion

// Step 2
POST /api/admin/users/{userId}/confirm-deletion
Body: { confirmationText: "DELETE user@example.com" }

// Step 3
POST /api/admin/users/{userId}/confirm-deletion
Body: { confirmationText: "DELETE user@example.com" }
```

### Cancel Deletion
```javascript
POST /api/users/me/cancel-deletion
// or
POST /api/admin/users/{userId}/cancel-deletion
```

## 📝 Migration Notes

- Old `DELETE /api/users/me` endpoint is deprecated
- Old `DELETE /api/admin/users/:id` endpoint is deprecated
- Use new 3-step confirmation endpoints instead
- Existing deleted users (if any) will have `deletedAt` set

