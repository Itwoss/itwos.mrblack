# Google Login Setup Guide

## Complete Google OAuth Configuration

---

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. **Sign in** with your Google account
3. **Create a new project** or select existing:
   - Click project dropdown (top left)
   - Click **New Project**
   - Name: `ITWOS AI` (or your project name)
   - Click **Create**

### 1.2 Enable Google+ API

1. Go to **APIs & Services** → **Library**
2. Search for **"Google+ API"** or **"People API"**
3. Click **Enable**

### 1.3 Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure OAuth consent screen:
   - **User Type:** External (for testing) or Internal (for organization)
   - **App name:** `ITWOS AI`
   - **User support email:** Your email
   - **Developer contact:** Your email
   - Click **Save and Continue**
   - **Scopes:** Click **Save and Continue** (default is fine)
   - **Test users:** Add your email, click **Save and Continue**
   - Click **Back to Dashboard**

4. **Create OAuth Client ID:**
   - **Application type:** Web application
   - **Name:** `ITWOS AI Web Client`
   - **Authorized JavaScript origins:**
     ```
     https://your-project.vercel.app
     https://your-project-*.vercel.app
     http://localhost:5173
     ```
   - **Authorized redirect URIs:**
     ```
     https://your-backend-url.com/api/auth/google/callback
     http://localhost:7000/api/auth/google/callback
     ```
   - Click **Create**

5. **Copy credentials:**
   - **Client ID:** `xxxxx.apps.googleusercontent.com`
   - **Client Secret:** `xxxxx`
   - **Save these!** You'll need them for backend

---

## Step 2: Configure Backend

### 2.1 Add to Backend Environment Variables

**If using Railway:**
1. Go to Railway dashboard
2. Select your backend project
3. Go to **Variables** tab
4. Add:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
FRONTEND_URL=https://your-project.vercel.app
```

**If using Render:**
1. Go to Render dashboard
2. Select your service
3. Go to **Environment** tab
4. Add the same variables

**If using local:**
Add to `backend/.env`:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
FRONTEND_URL=https://your-project.vercel.app
```

---

## Step 3: Configure Frontend (Vercel)

### 3.1 Add Environment Variables

1. Go to **Vercel Dashboard**
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:

```env
VITE_API_URL=https://your-backend-url.com/api
VITE_SOCKET_URL=https://your-backend-url.com
VITE_SERVER_URL=https://your-backend-url.com
```

5. **Redeploy** your project

---

## Step 4: Test Google Login

1. **Visit your Vercel site:** `https://your-project.vercel.app`
2. **Click "Sign in with Google"** or **"Login with Google"**
3. **Should redirect to Google:**
   - Select Google account
   - Grant permissions
4. **Should redirect back to your site:**
   - User should be logged in
   - Profile should show Google account info

---

## 🔧 Backend Route Configuration

Your backend should have this route:

```javascript
// backend/src/routes/auth.js
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}))

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    // Generate JWT tokens
    // Redirect to frontend with tokens
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=...`)
  }
)
```

---

## ✅ Checklist

### Google Cloud Console:
- [ ] Project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth client ID created
- [ ] Authorized JavaScript origins added (Vercel URL)
- [ ] Authorized redirect URIs added (backend URL)
- [ ] Client ID and Secret copied

### Backend:
- [ ] `GOOGLE_CLIENT_ID` environment variable set
- [ ] `GOOGLE_CLIENT_SECRET` environment variable set
- [ ] `FRONTEND_URL` set to Vercel URL
- [ ] Backend restarted/redeployed

### Frontend:
- [ ] `VITE_API_URL` set to backend URL
- [ ] `VITE_SOCKET_URL` set to backend URL
- [ ] `VITE_SERVER_URL` set to backend URL
- [ ] Frontend redeployed

### Testing:
- [ ] Google login button visible
- [ ] Clicking redirects to Google
- [ ] After login, redirects back to site
- [ ] User is logged in
- [ ] User profile shows Google account info

---

## 🆘 Common Issues

### "redirect_uri_mismatch" Error

**Problem:** Redirect URI doesn't match

**Solution:**
1. Check Google Console → Credentials → OAuth client
2. Verify redirect URI exactly matches:
   ```
   https://your-backend-url.com/api/auth/google/callback
   ```
3. No trailing slashes
4. Must be HTTPS (except localhost)

### "invalid_client" Error

**Problem:** Client ID or Secret is wrong

**Solution:**
1. Double-check `GOOGLE_CLIENT_ID` in backend
2. Double-check `GOOGLE_CLIENT_SECRET` in backend
3. Make sure no extra spaces
4. Restart backend after adding variables

### Login Works But User Not Created

**Problem:** Backend not saving user to database

**Solution:**
1. Check MongoDB connection
2. Check backend logs for errors
3. Verify user model is correct

### CORS Error

**Problem:** Frontend can't call backend

**Solution:**
1. Check `FRONTEND_URL` in backend matches Vercel URL
2. Check backend CORS configuration
3. Verify `VITE_API_URL` in frontend is correct

---

## 📝 Example Configuration

### Google Console:
```
Authorized JavaScript origins:
- https://my-app.vercel.app
- https://my-app-*.vercel.app
- http://localhost:5173

Authorized redirect URIs:
- https://my-backend.railway.app/api/auth/google/callback
- http://localhost:7000/api/auth/google/callback
```

### Backend (Railway):
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
FRONTEND_URL=https://my-app.vercel.app
```

### Frontend (Vercel):
```env
VITE_API_URL=https://my-backend.railway.app/api
VITE_SOCKET_URL=https://my-backend.railway.app
VITE_SERVER_URL=https://my-backend.railway.app
```

---

## 🎉 Success!

Once configured, users can:
- Click "Sign in with Google"
- Select their Google account
- Automatically logged into your app
- Profile synced with Google account

---

## 📚 Resources

- **Google OAuth Docs:** https://developers.google.com/identity/protocols/oauth2
- **Google Cloud Console:** https://console.cloud.google.com/
- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app

