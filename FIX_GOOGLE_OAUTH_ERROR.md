# Fix: "Access blocked: This app's request is invalid"

## 🔴 Error: Access blocked: This app's request is invalid

This error means your **Google OAuth redirect URI** doesn't match what's configured in Google Console.

---

## ✅ Quick Fix Steps

### Step 1: Check Your Backend Auth Route

Your backend Google OAuth callback route is likely:
```
/api/auth/google/callback
```

So the full redirect URI should be:
```
https://fitchy-asymmetrically-nigel.ngrok-free.dev/api/auth/google/callback
```

---

### Step 2: Update Google Cloud Console

1. **Go to:** https://console.cloud.google.com/
2. **Select your project**
3. **Go to:** APIs & Services → Credentials
4. **Click on your OAuth 2.0 Client ID**
5. **Under "Authorized redirect URIs", add:**

```
https://fitchy-asymmetrically-nigel.ngrok-free.dev/api/auth/google/callback
```

**Also add for local development:**
```
http://localhost:7000/api/auth/google/callback
```

6. **Under "Authorized JavaScript origins", add:**

```
https://fitchy-asymmetrically-nigel.ngrok-free.dev
https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
http://localhost:5173
http://localhost:7000
```

7. **Click "Save"**

---

### Step 3: Fix FRONTEND_URL (Remove Trailing Slash)

**Current (WRONG):**
```
FRONTEND_URL=https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app/
```

**Correct:**
```
FRONTEND_URL=https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
```

**Remove the trailing slash `/` at the end!**

---

### Step 4: Verify Backend Environment Variables

**Backend (Railway/Render or local .env):**

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
```

**Important:** No trailing slash in FRONTEND_URL!

---

### Step 5: Restart Backend

After updating environment variables:
- **If local:** Restart backend (`npm start`)
- **If Railway/Render:** Redeploy backend

---

## 📋 Complete Google Console Configuration

### Authorized JavaScript origins:
```
https://fitchy-asymmetrically-nigel.ngrok-free.dev
https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
http://localhost:5173
http://localhost:7000
```

### Authorized redirect URIs:
```
https://fitchy-asymmetrically-nigel.ngrok-free.dev/api/auth/google/callback
http://localhost:7000/api/auth/google/callback
```

**Note:** Add your production backend URL when you deploy to Railway/Render:
```
https://your-backend.railway.app/api/auth/google/callback
```

---

## ✅ Checklist

- [ ] Google Console redirect URI matches backend route
- [ ] Google Console JavaScript origins include Vercel URL
- [ ] `FRONTEND_URL` has NO trailing slash
- [ ] Backend environment variables are correct
- [ ] Backend restarted/redeployed
- [ ] ngrok is running (if using ngrok)

---

## 🔍 Common Issues

### Issue 1: Redirect URI Mismatch

**Error:** "redirect_uri_mismatch"

**Fix:**
- Check exact redirect URI in Google Console
- Must match exactly: `https://your-backend-url.com/api/auth/google/callback`
- No trailing slashes
- Must be HTTPS (except localhost)

### Issue 2: JavaScript Origin Not Allowed

**Error:** "Origin not allowed"

**Fix:**
- Add Vercel URL to Authorized JavaScript origins
- Add ngrok URL to Authorized JavaScript origins
- Must include protocol (`https://`)

### Issue 3: OAuth Consent Screen Not Configured

**Error:** "OAuth consent screen required"

**Fix:**
1. Go to Google Console → OAuth consent screen
2. Fill in required fields:
   - App name
   - User support email
   - Developer contact
3. Add test users (your email)
4. Save and continue

---

## 🧪 Test After Fixing

1. **Clear browser cache**
2. **Visit your Vercel site**
3. **Click "Sign in with Google"**
4. **Should redirect to Google login**
5. **After login, should redirect back to your site**

---

## 📝 Your Current Configuration

### Frontend (Vercel) - ✅ Correct:
```
VITE_API_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev/api
VITE_SOCKET_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev
VITE_SERVER_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev
```

### Backend - ⚠️ Fix FRONTEND_URL:
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
```

**Remove the `/` at the end!**

### Google Console - ⚠️ Add These:
```
Authorized JavaScript origins:
- https://fitchy-asymmetrically-nigel.ngrok-free.dev
- https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
- http://localhost:5173
- http://localhost:7000

Authorized redirect URIs:
- https://fitchy-asymmetrically-nigel.ngrok-free.dev/api/auth/google/callback
- http://localhost:7000/api/auth/google/callback
```

---

## 🎯 Most Likely Issue

**The redirect URI in Google Console doesn't match your backend route.**

**Fix:** Add this exact URI to Google Console:
```
https://fitchy-asymmetrically-nigel.ngrok-free.dev/api/auth/google/callback
```

And remove the trailing slash from `FRONTEND_URL`!

