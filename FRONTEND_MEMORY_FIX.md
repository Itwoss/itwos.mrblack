# Frontend Memory Issue Fix

## Issue
The frontend development server (Vite) crashed with a "JavaScript heap out of memory" error:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

## Root Cause
Node.js has a default memory limit (around 2GB) which can be exceeded when:
- Working with large React applications
- Many components and dependencies
- Hot module replacement (HMR) accumulating memory over time
- Large node_modules directory

## Solution

### Temporary Fix (Current Session)
Restart the frontend with increased memory allocation:
```bash
cd frontend
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

This increases the heap size to 4GB (4096 MB).

### Permanent Fix (Already Applied)
The `package.json` already has this configured in the dev script:
```json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=8192' vite"
  }
}
```

This sets the heap size to 8GB (8192 MB) automatically.

## Prevention Tips

1. **Restart Development Server Regularly**
   - If you're working for long periods, restart the dev server every few hours
   - This clears accumulated memory from HMR

2. **Clear Node Modules Cache**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **Monitor Memory Usage**
   - Use Activity Monitor (Mac) or Task Manager (Windows)
   - If Node process exceeds 2-3GB, consider restarting

4. **Optimize Imports**
   - Use tree-shaking friendly imports
   - Example: `import { Button } from 'antd'` instead of `import Button from 'antd/lib/button'`

## Current Status
✅ **FIXED** - Frontend running on http://localhost:5173
- Memory limit increased to 4GB
- Server started successfully
- Both frontend (5173) and backend (7000) are running

## Quick Commands

### Check if Frontend is Running
```bash
curl -s http://localhost:5173 > /dev/null && echo "Running" || echo "Not running"
```

### Restart Frontend with More Memory
```bash
cd frontend
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

### Kill and Restart Frontend
```bash
lsof -ti:5173 | xargs kill -9
cd frontend
npm run dev
```

## Related Files
- `frontend/package.json` - Dev script configuration
- `frontend/vite.config.js` - Vite configuration

