# FRONTEND_URL Explanation

## What is FRONTEND_URL?

`FRONTEND_URL` is a **backend environment variable** that tells your backend server:
- Where your frontend is hosted (for CORS)
- Where to redirect users after login/actions
- Which domains are allowed to access the API

---

## What Value Should You Use?

### For Vercel Deployment:

Use your **Vercel project URL**:

```
FRONTEND_URL=https://your-project-name.vercel.app
```

**Example:**
```
FRONTEND_URL=https://itwos-ai.vercel.app
```

---

## How to Find Your Vercel URL

### Method 1: After Deployment

1. Deploy your project to Vercel
2. Vercel will give you a URL like:
   ```
   https://your-project-name.vercel.app
   ```
3. Copy this URL

### Method 2: Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Click on your project
3. You'll see the URL at the top:
   ```
   https://your-project-name.vercel.app
   ```

### Method 3: Custom Domain

If you have a custom domain:
```
FRONTEND_URL=https://yourdomain.com
```

---

## Where to Set FRONTEND_URL

### Backend (Railway/Render):

**Railway:**
1. Go to Railway dashboard
2. Select your backend project
3. Go to **Variables** tab
4. Add:
   ```
   FRONTEND_URL=https://your-project.vercel.app
   ```

**Render:**
1. Go to Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add:
   ```
   FRONTEND_URL=https://your-project.vercel.app
   ```

**Local Development:**
Add to `backend/.env`:
```
FRONTEND_URL=http://localhost:5173
```

---

## Why FRONTEND_URL is Important

### 1. CORS Configuration

Your backend uses `FRONTEND_URL` to allow requests from your frontend:

```javascript
// backend/server.js
const allowedOrigins = [
  process.env.FRONTEND_URL,
  // ... other origins
]
```

### 2. Redirects After Login

After Google login or other auth actions, backend redirects to:
```
${FRONTEND_URL}/auth/callback
```

### 3. Security

Only allows requests from your specified frontend domain.

---

## Complete Example

### Your Setup:

**Frontend (Vercel):**
- URL: `https://itwos-ai.vercel.app`

**Backend (Railway):**
- URL: `https://itwos-ai-backend.railway.app`

**Backend Environment Variables:**
```env
FRONTEND_URL=https://itwos-ai.vercel.app
```

**Frontend Environment Variables (Vercel):**
```env
VITE_API_URL=https://itwos-ai-backend.railway.app/api
VITE_SOCKET_URL=https://itwos-ai-backend.railway.app
VITE_SERVER_URL=https://itwos-ai-backend.railway.app
```

---

## Common Values

### Development (Local):
```
FRONTEND_URL=http://localhost:5173
```

### Testing (Vercel Preview):
```
FRONTEND_URL=https://your-project-git-branch.vercel.app
```

### Production (Vercel):
```
FRONTEND_URL=https://your-project.vercel.app
```

### Custom Domain:
```
FRONTEND_URL=https://yourdomain.com
```

---

## Important Notes

⚠️ **No trailing slash:**
- ✅ Correct: `https://your-project.vercel.app`
- ❌ Wrong: `https://your-project.vercel.app/`

⚠️ **Must match exactly:**
- If your Vercel URL is `https://itwos-ai.vercel.app`
- Use exactly: `FRONTEND_URL=https://itwos-ai.vercel.app`
- Don't use: `https://www.itwos-ai.vercel.app` (unless that's your actual URL)

⚠️ **HTTPS in production:**
- Always use `https://` for production
- Only use `http://` for local development

---

## Quick Checklist

- [ ] Deploy frontend to Vercel
- [ ] Copy your Vercel URL
- [ ] Add `FRONTEND_URL` to backend environment variables
- [ ] Use exact URL (no trailing slash)
- [ ] Use `https://` for production
- [ ] Restart/redeploy backend after adding

---

## Example Configuration

### Scenario: You deployed to Vercel and got this URL:
```
https://itwos-ai-app.vercel.app
```

### Backend (Railway) Environment Variables:
```env
FRONTEND_URL=https://itwos-ai-app.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MONGO_URI=mongodb+srv://...
JWT_ACCESS_SECRET=your-secret
# ... other variables
```

### Frontend (Vercel) Environment Variables:
```env
VITE_API_URL=https://your-backend.railway.app/api
VITE_SOCKET_URL=https://your-backend.railway.app
VITE_SERVER_URL=https://your-backend.railway.app
```

---

## Summary

**FRONTEND_URL = Your Vercel Project URL**

```
FRONTEND_URL=https://your-project-name.vercel.app
```

That's it! Just use your Vercel deployment URL.

