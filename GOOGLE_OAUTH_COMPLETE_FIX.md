# Complete Google OAuth Fix - Error 401: invalid_client

## 🔴 Your Error

```
Error 401: invalid_client
The OAuth client was not found.
```

---

## ✅ Step-by-Step Fix

### Step 1: Check Render Environment Variables

**Go to:** Render Dashboard → Your Service → Environment

**Verify these exist and are correct:**

```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
```

**If missing or wrong:**
1. Click "Add Environment Variable" or "Edit"
2. Update with correct values
3. Click "Save Changes"
4. Wait for redeployment

---

### Step 2: Update Google Console

**Go to:** https://console.cloud.google.com/apis/credentials

1. **Click on your OAuth 2.0 Client ID**
2. **Under "Authorized JavaScript origins", add:**
   ```
   https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
   https://itwos-mrblack.onrender.com
   http://localhost:5173
   http://localhost:7000
   ```

3. **Under "Authorized redirect URIs", add:**
   ```
   https://itwos-mrblack.onrender.com/api/auth/google/callback
   http://localhost:7000/api/auth/google/callback
   ```

4. **Click "Save"**

---

### Step 3: Verify Backend Route

Your backend uses:
```
POST /api/auth/google
```

**The callback happens on the frontend**, not backend. So you might not need a backend callback URI if your frontend handles it.

**Check your frontend code** - it should:
1. Call Google OAuth
2. Get access token
3. Send to backend: `POST /api/auth/google` with token
4. Backend verifies and creates/login user

---

### Step 4: Test Again

1. **Clear browser cache** (Cmd+Shift+R)
2. **Visit:** https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
3. **Click "Sign in with Google"**
4. **Should work now!**

---

## 🔍 Verify Everything

### Render Environment Variables:
- [ ] `GOOGLE_CLIENT_ID` = Your Google Console Client ID
- [ ] `GOOGLE_CLIENT_SECRET` = Your Google Console Client Secret
- [ ] `FRONTEND_URL` = `https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app` (no trailing slash)

### Google Console:
- [ ] Vercel URL in "Authorized JavaScript origins"
- [ ] Render URL in "Authorized JavaScript origins"
- [ ] Backend callback in "Authorized redirect URIs" (if needed)

---

## 🆘 Still Not Working?

### Check 1: Client ID Matches

**In Google Console:**
- Copy the exact Client ID
- Compare with Render `GOOGLE_CLIENT_ID`
- Must match exactly (no spaces, no typos)

### Check 2: Client Secret Matches

**In Google Console:**
- Click "Reset Secret" if unsure
- Copy the new secret
- Update in Render `GOOGLE_CLIENT_SECRET`

### Check 3: OAuth Consent Screen

1. **Go to:** OAuth consent screen
2. **Make sure it's configured:**
   - App name
   - User support email
   - Developer contact
3. **Add test users** (your email: `sjay9327@gmail.com`)

---

## 📝 Quick Fix Summary

1. **Render:** Add/verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. **Google Console:** Add Vercel and Render URLs to authorized origins
3. **Google Console:** Add backend callback URI (if needed)
4. **Test:** Clear cache and try again

---

## ✅ After Fixing

Your Google login should work! Users can sign in with their Google accounts.

