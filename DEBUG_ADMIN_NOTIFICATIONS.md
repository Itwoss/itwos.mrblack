# Step-by-Step Debugging Guide: Admin Bell Notification

## Overview
This guide will help you debug why the admin bell notification shows "No notifications yet".

## Step 1: Check Browser Console Logs

### 1.1 Open Browser Console
1. Open your admin dashboard in the browser
2. Press `F12` or `Right-click → Inspect → Console tab`
3. Clear the console (click the 🚫 icon or press `Ctrl+L` / `Cmd+K`)

### 1.2 Check Initial Load Logs
Look for these logs when the page loads:

```
🔔 NotificationBell Debug: {
  userId: "...",
  userRole: "...",
  hasAdminUser: true/false,
  isAuthenticated: true/false,
  userRoleFromUser: "...",
  adminUserInStorage: true/false
}
```

**What to check:**
- ✅ `userRole` should be `"admin"` (not `"user"`)
- ✅ `hasAdminUser` should be `true`
- ✅ `isAuthenticated` should be `true`
- ✅ `userId` should be a valid MongoDB ObjectId (not `null`)

### 1.3 Check When Bell is Clicked
Click the notification bell and look for:

```
🔔 ========== FETCHING NOTIFICATIONS ==========
🔔 Step 1: Hook called with: { userId, userRole, ... }
🔔 Step 2: API Call selected: { isAdminUser: true/false, endpoint: "..." }
🔔 Step 3: Making API request...
🔔 Step 4: API Response received: { status: 200, ... }
🔔 Step 5: Parsing response data...
🔔 Step 6: Checking response structure...
🔔 Step 7: Validating notifications...
🔔 Step 8: Final processed notifications: { validCount: X, ... }
🔔 ========== FETCH COMPLETE ==========
```

**What to check at each step:**

#### Step 1: Hook Parameters
- `userId`: Should be a valid ObjectId (not null)
- `userRole`: Should be `"admin"` (not `"user"`)
- `isAdmin`: Should be `true`

#### Step 2: API Endpoint Selection
- `isAdminUser`: Should be `true`
- `endpoint`: Should be `"/api/notifications/admin"` (not `/api/notifications`)

#### Step 4: API Response
- `status`: Should be `200` (not `401`, `404`, or `500`)
- `hasSuccess`: Should be `true`
- `hasData`: Should be `true`

#### Step 5-6: Response Structure
- Check if `response.data.data.notifications` exists
- Check if it's an array
- Check the count of notifications

#### Step 8: Final Result
- `validCount`: Should be > 0 if notifications exist
- `unreadCount`: Should show the number of unread notifications

## Step 2: Check Network Tab

### 2.1 Open Network Tab
1. In browser DevTools, go to **Network** tab
2. Filter by `notifications` or `admin`
3. Click the notification bell

### 2.2 Check the Request
Look for a request to:
- ✅ `http://localhost:7000/api/notifications/admin` (for admin)
- ❌ `http://localhost:7000/api/notifications` (wrong - this is for regular users)

**Request Headers should include:**
```
Authorization: Bearer <token>
```

### 2.3 Check the Response
Click on the request and check:

**Response Status:**
- ✅ `200 OK` - Success
- ❌ `401 Unauthorized` - Token expired or invalid
- ❌ `404 Not Found` - Wrong endpoint
- ❌ `500 Internal Server Error` - Backend error

**Response Body should look like:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "...",
        "title": "...",
        "message": "...",
        "type": "prebook_payment",
        "read": false,
        "createdAt": "..."
      }
    ],
    "pagination": { ... },
    "unreadCount": 1
  }
}
```

## Step 3: Check Backend Logs

### 3.1 View Backend Logs
Run this command in terminal:
```bash
tail -f /tmp/server.log | grep -i "notification\|admin"
```

Or check the backend console where `node server.js` is running.

### 3.2 Look for These Logs
When you click the bell, you should see:

```
🔔 Admin notifications query: {
  adminId: "...",
  query: { userId: "...", type: { $in: [...] } },
  page: 1,
  limit: 50
}

🔔 Admin notifications found: {
  count: X,
  total: X,
  unreadCount: X,
  sampleNotification: { ... }
}

🔔 Sending admin notifications response: {
  success: true,
  notificationsCount: X,
  unreadCount: X,
  hasPagination: true
}
```

**What to check:**
- `adminId`: Should match the logged-in admin's ID
- `count`: Should be > 0 if notifications exist
- `unreadCount`: Should show unread notifications

## Step 4: Check Database

### 4.1 Connect to MongoDB
```bash
mongosh
# or
mongo
```

### 4.2 Check Notifications Collection
```javascript
use your_database_name

// Find admin user ID
db.users.findOne({ role: "admin" }, { _id: 1, email: 1, name: 1 })

// Replace ADMIN_USER_ID with the actual admin ID from above
db.notifications.find({ 
  userId: ObjectId("ADMIN_USER_ID"),
  type: { $in: ["prebook_payment", "admin_action", "system_announcement", "prebook_request"] }
}).sort({ createdAt: -1 }).limit(10)
```

**What to check:**
- Are there notifications with `userId` matching the admin?
- Are the notification types correct?
- Are they recent (not expired)?

## Step 5: Common Issues and Fixes

### Issue 1: `userRole` is `"user"` instead of `"admin"`
**Fix:** Check if `adminUser` exists in localStorage:
```javascript
// In browser console:
localStorage.getItem('adminUser')
// Should return a JSON string, not null
```

**Solution:** Log out and log back in as admin.

### Issue 2: API returns 401 Unauthorized
**Fix:** Token expired. The interceptor should auto-refresh, but check:
```javascript
// In browser console:
localStorage.getItem('adminToken')
localStorage.getItem('accessToken')
// Should have valid tokens
```

**Solution:** Log out and log back in.

### Issue 3: API returns empty array
**Fix:** Check if notifications exist in database (Step 4).

**Solution:** Create a test notification or wait for a real one (e.g., prebook payment).

### Issue 4: Wrong endpoint being called
**Fix:** Check Step 2.2 - should be `/api/notifications/admin`.

**Solution:** Ensure `userRole === 'admin'` in NotificationBell component.

## Step 6: Quick Test

### Test 1: Manual API Call
In browser console:
```javascript
const token = localStorage.getItem('adminToken') || localStorage.getItem('accessToken');
fetch('http://localhost:7000/api/notifications/admin', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log('Manual API Response:', data));
```

**Expected:** Should return notifications array.

### Test 2: Check localStorage
```javascript
console.log({
  adminUser: localStorage.getItem('adminUser'),
  adminToken: localStorage.getItem('adminToken'),
  user: localStorage.getItem('user'),
  token: localStorage.getItem('token')
});
```

**Expected:** `adminUser` and `adminToken` should exist.

## Summary Checklist

- [ ] `userRole` is `"admin"` in console logs
- [ ] `hasAdminUser` is `true`
- [ ] API endpoint is `/api/notifications/admin`
- [ ] API response status is `200`
- [ ] API response has `success: true`
- [ ] API response has `data.notifications` array
- [ ] Backend logs show notifications found
- [ ] Database has notifications for admin user
- [ ] No errors in console or network tab

## Next Steps

If all checks pass but notifications still don't show:
1. Check the `NotificationPopup` component rendering logic
2. Check if notifications are being filtered out
3. Check if there's a display issue (CSS/styling)

If any check fails, follow the fix for that specific issue.

