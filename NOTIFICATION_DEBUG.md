# Notification Debugging Guide

## Common Issues and Solutions

### 1. Check if userId is being passed correctly
- Open browser console
- Look for: `🔔 useNotifications fetchNotifications called:`
- Verify `userId` is not `null`, `undefined`, or `'mock-user-id'`

### 2. Check API Response
- Open Network tab in browser DevTools
- Look for request to `/api/notifications?page=1&limit=50`
- Check response status and body

### 3. Check Backend Logs
- Look for: `📬 Notifications fetched:` in backend console
- Check for any errors in backend terminal

### 4. Test API Endpoint Manually
```bash
# Get your auth token from browser localStorage
# Then test:
curl -X GET "http://localhost:7000/api/notifications?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### 5. Common Problems

#### Problem: Loading state never stops
- **Solution**: Check if `setLoading(false)` is being called in `finally` block
- **Check**: Safety timeout should stop loading after 20 seconds

#### Problem: Empty notifications array
- **Solution**: Check if user has notifications in database
- **Check**: Both Notification collection and User.notifications array

#### Problem: CORS errors
- **Solution**: Verify `withCredentials: true` in axios config
- **Check**: Backend CORS allows frontend origin

#### Problem: 401 Unauthorized
- **Solution**: Check if auth token is valid and not expired
- **Check**: Token is being sent in Authorization header

### 6. Debug Steps

1. **Check Frontend Console:**
   - Look for `🔔` prefixed logs
   - Check for error messages

2. **Check Network Tab:**
   - Verify request is being made
   - Check response status code
   - Check response body structure

3. **Check Backend Console:**
   - Look for route handler logs
   - Check for database errors
   - Verify userId is correct

4. **Test with Postman/curl:**
   - Manually test the endpoint
   - Verify authentication works
   - Check response structure

### 7. Expected Response Structure
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "...",
        "userId": "...",
        "type": "follow_request",
        "title": "Follow Request",
        "message": "...",
        "read": false,
        "createdAt": "...",
        "from": {...}
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 0,
      "pages": 0
    },
    "unreadCount": 0
  }
}
```

