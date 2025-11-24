# Backend Server Restart Required

## Issue
The `/api/admin/posts` endpoint is returning 404 because the backend server needs to be restarted to load the new route.

## Solution

### Step 1: Stop the Backend Server
If the backend server is running, stop it:
- Press `Ctrl+C` in the terminal where the server is running
- Or kill the process if running in background

### Step 2: Restart the Backend Server
Navigate to the backend directory and start the server:

```bash
cd backend
npm start
# or
node server.js
# or if using nodemon
npm run dev
```

### Step 3: Verify the Route is Loaded
After restarting, you should see in the console that the server started successfully. The route `/api/admin/posts` should now be available.

## Verification

Test the endpoint:
```bash
curl http://localhost:7000/api/admin/posts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Or check in the browser console - the 404 error should be resolved.

## Why This Happens

When you add a new route file (`adminPosts.js`), Node.js needs to restart to:
1. Load the new file
2. Register the route with Express
3. Make it available for requests

The route is correctly registered in `server.js` at line 508:
```javascript
app.use('/api/admin/posts', require('./src/routes/adminPosts'))
```

After restart, the route will be active and the frontend should be able to fetch posts successfully.

