# Fix: Google OAuth "Error 401: invalid_client"

## 🔴 Error: "The OAuth client was not found"

This means your Google OAuth credentials don't match or the redirect URI is wrong.

---

## ✅ Quick Fix Steps

### Step 1: Verify Google OAuth Credentials in Render

1. **Go to:** Render Dashboard → Your Backend Service → Environment tab
2. **Check these variables exist:**
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
3. **Verify the values are correct:**
   - `GOOGLE_CLIENT_ID` should match your Google Console Client ID
   - `GOOGLE_CLIENT_SECRET` should match your Google Console Client Secret
4. **If wrong or missing:**
   - Click "Edit" on the variable
   - Update with correct values
   - Click "Save Changes"
   - Wait for redeployment

---

### Step 2: Update Google Console Configuration

1. **Go to:** https://console.cloud.google.com/
2. **Select your project**
3. **Go to:** APIs & Services → Credentials
4. **Click on your OAuth 2.0 Client ID:**
   - `611643417807-5lqdmud2ui6sd7rf8k4hg5ocr2gi6gk4`
5. **Check "Authorized JavaScript origins":**
   - Add your **Vercel frontend URL:**
     ```
     https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
     ```
   - Add your **Render backend URL:**
     ```
     https://itwos-mrblack.onrender.com
     ```
   - Add for local development:
     ```
     http://localhost:5173
     http://localhost:7000
     ```

6. **Check "Authorized redirect URIs":**
   - Add your **Render backend callback:**
     ```
     https://itwos-mrblack.onrender.com/api/auth/google/callback
     ```
   - Add for local development:
     ```
     http://localhost:7000/api/auth/google/callback
     ```
   - **Important:** The callback goes to your **backend**, not frontend!

7. **Click "Save"**

---

### Step 3: Verify FRONTEND_URL in Render

1. **Go to:** Render Dashboard → Environment tab
2. **Check `FRONTEND_URL`:**
   - Should be: `https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app`
   - **NO trailing slash!**
3. **If wrong:**
   - Click "Edit"
   - Update to your Vercel URL
   - Click "Save Changes"

---

### Step 4: Check Backend Auth Route

Your backend should have this route:
```
POST /api/auth/google
```

**Not:**
- `GET /auth/google` (wrong)
- `/google` (wrong)

---

## 🔍 Verify Your URLs

### Your Current URLs:

**Frontend (Vercel):**
```
https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
```

**Backend (Render):**
```
https://itwos-mrblack.onrender.com
```

---

## 📋 Google Console Configuration Checklist

### Authorized JavaScript origins:
- [ ] `https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app`
- [ ] `https://itwos-mrblack.onrender.com`
- [ ] `http://localhost:5173` (for local dev)
- [ ] `http://localhost:7000` (for local dev)

### Authorized redirect URIs:
- [ ] `https://itwos-mrblack.onrender.com/api/auth/google/callback`
- [ ] `http://localhost:7000/api/auth/google/callback` (for local dev)

---

## 🆘 Common Issues

### Issue 1: "invalid_client" Error

**Problem:** Client ID or Secret is wrong

**Fix:**
1. Check Render environment variables
2. Verify `GOOGLE_CLIENT_ID` matches Google Console
3. Verify `GOOGLE_CLIENT_SECRET` matches Google Console
4. No extra spaces or typos

---

### Issue 2: "redirect_uri_mismatch"

**Problem:** Redirect URI doesn't match

**Fix:**
1. Check Google Console → Authorized redirect URIs
2. Must include: `https://itwos-mrblack.onrender.com/api/auth/google/callback`
3. Exact match required (no trailing slashes)
4. Must be HTTPS (except localhost)

---

### Issue 3: OAuth Client Not Found

**Problem:** Client ID doesn't exist or is wrong

**Fix:**
1. Go to Google Console → Credentials
2. Find your OAuth client ID
3. Copy the exact Client ID
4. Update in Render: `GOOGLE_CLIENT_ID`
5. Make sure it matches exactly

---

## ✅ Complete Fix Checklist

- [ ] `GOOGLE_CLIENT_ID` in Render matches Google Console
- [ ] `GOOGLE_CLIENT_SECRET` in Render matches Google Console
- [ ] `FRONTEND_URL` in Render is your Vercel URL (no trailing slash)
- [ ] Vercel URL added to Google Console "Authorized JavaScript origins"
- [ ] Render backend URL added to Google Console "Authorized JavaScript origins"
- [ ] Backend callback URI added to Google Console "Authorized redirect URIs"
- [ ] All changes saved in Google Console
- [ ] Render redeployed after variable changes
- [ ] Test Google login again

---

## 🧪 Test After Fixing

1. **Visit your Vercel site:**
   ```
   https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
   ```

2. **Click "Sign in with Google"**

3. **Should:**
   - Redirect to Google login
   - Show your Google account selection
   - After login, redirect back to your site
   - User should be logged in

---

## 📝 Your Exact Configuration

### Render Environment Variables:
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
```

### Google Console:
**Authorized JavaScript origins:**
```
https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
https://itwos-mrblack.onrender.com
http://localhost:5173
http://localhost:7000
```

**Authorized redirect URIs:**
```
https://itwos-mrblack.onrender.com/api/auth/google/callback
http://localhost:7000/api/auth/google/callback
```

---

## 🎯 Most Likely Issue

**The redirect URI in Google Console doesn't match your backend URL.**

**Fix:**
1. Go to Google Console
2. Add: `https://itwos-mrblack.onrender.com/api/auth/google/callback`
3. Save
4. Try again

---

## ✅ After Fixing

1. **Clear browser cache** (Cmd+Shift+R on Mac)
2. **Try Google login again**
3. **Should work now!**

---

## 🔗 Quick Links

- **Google Console:** https://console.cloud.google.com/apis/credentials
- **Render Dashboard:** https://dashboard.render.com
- **Vercel Dashboard:** https://vercel.com/dashboard

---

## 💡 Pro Tips

1. **Redirect URI must match exactly** - No trailing slashes
2. **JavaScript origins** - Add both frontend and backend URLs
3. **HTTPS required** - Except for localhost
4. **Save in Google Console** - Changes take effect immediately
5. **Redeploy Render** - After changing environment variables

---

## ✅ You're Ready!

Once all configurations match, Google OAuth will work perfectly!

