# What to Do After Adding Variables in Railway

## ✅ Steps After Adding Environment Variables

---

## Step 1: Wait for Automatic Redeployment

1. **Railway automatically redeploys** when you add variables
2. **Go to "Deployments" tab** to see the deployment progress
3. **Wait 2-3 minutes** for deployment to complete
4. **You'll see:**
   - Building...
   - Deploying...
   - ✅ Deployed (green checkmark)

---

## Step 2: Check Deployment Status

1. **Go to "Deployments" tab**
2. **Look for the latest deployment**
3. **Should show:** ✅ **Active** or **Deployed**
4. **If there's an error:**
   - Click on the deployment
   - Check the logs
   - Fix any issues

---

## Step 3: Get Your Backend URL

1. **Go to "Settings" tab**
2. **Scroll down to "Public Domain"** section
3. **You'll see your backend URL:**
   ```
   https://your-backend-name.railway.app
   ```
4. **Copy this URL** - you'll need it for Vercel!

---

## Step 4: Test Your Backend

1. **Open a new browser tab**
2. **Visit your backend health endpoint:**
   ```
   https://your-backend-name.railway.app/api/health
   ```
3. **Should see:**
   ```json
   {
     "success": true,
     "message": "Server is running",
     "timestamp": "...",
     "socketIO": "enabled"
   }
   ```

**If you see this, your backend is working! ✅**

---

## Step 5: Check Logs (Optional)

1. **Go to "Logs" tab**
2. **Look for:**
   - ✅ "Server running on port 7000"
   - ✅ "MongoDB connected"
   - ✅ "Socket.IO enabled"
3. **If you see errors:**
   - Check variable names (case-sensitive)
   - Check MongoDB connection string
   - Check JWT secrets are set

---

## Step 6: Update Vercel Environment Variables

Now that your backend is live, update your Vercel frontend:

1. **Go to:** https://vercel.com
2. **Select your frontend project**
3. **Go to:** Settings → Environment Variables
4. **Update these variables:**

```
VITE_API_URL=https://your-backend-name.railway.app/api
VITE_SOCKET_URL=https://your-backend-name.railway.app
VITE_SERVER_URL=https://your-backend-name.railway.app
```

**Replace `your-backend-name.railway.app` with your actual Railway URL!**

5. **Redeploy Vercel:**
   - Go to Deployments tab
   - Click "⋯" (three dots) on latest deployment
   - Click "Redeploy"

---

## Step 7: Test Full Stack

1. **Visit your Vercel site:**
   ```
   https://your-project.vercel.app
   ```

2. **Test features:**
   - ✅ Login/Register
   - ✅ Google login
   - ✅ API calls
   - ✅ Real-time features (Socket.IO)

---

## ✅ Success Checklist

- [ ] All variables added in Railway
- [ ] Railway deployment completed successfully
- [ ] Backend health check works (`/api/health`)
- [ ] Backend URL copied
- [ ] Vercel environment variables updated
- [ ] Vercel redeployed
- [ ] Frontend can connect to backend
- [ ] Google login works
- [ ] All features tested

---

## 🆘 Troubleshooting

### Backend Not Starting?

**Check Logs tab:**
- Look for error messages
- Common issues:
  - Missing variables
  - Wrong MongoDB connection string
  - Invalid JWT secrets

**Fix:**
- Double-check all variables are added
- Verify MongoDB URI format
- Regenerate JWT secrets if needed

---

### Health Check Fails?

**Test manually:**
```bash
curl https://your-backend-name.railway.app/api/health
```

**If 404:**
- Check deployment is complete
- Wait a few more minutes
- Check if backend is actually running

**If 500:**
- Check Logs tab for errors
- Verify all required variables are set
- Check MongoDB connection

---

### Frontend Can't Connect?

**Check:**
1. Vercel environment variables are updated
2. Vercel is redeployed
3. Backend URL is correct (no typos)
4. Backend is running (check health endpoint)

**Fix:**
- Update `VITE_API_URL` in Vercel
- Make sure it's: `https://your-backend.railway.app/api`
- Redeploy Vercel

---

### Google Login Not Working?

**Check:**
1. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Railway
2. `FRONTEND_URL` is set correctly (no trailing slash)
3. Google Console has correct redirect URIs

**Fix:**
- Verify variables in Railway
- Check Google Console configuration
- See `FIX_GOOGLE_OAUTH_ERROR.md` for details

---

## 📊 Railway Dashboard Overview

After adding variables, you'll see:

```
Railway Project
├── Deployments ← Check deployment status
├── Variables ← Your environment variables (already added)
├── Settings ← Get your backend URL here
├── Metrics ← Usage statistics
└── Logs ← View backend logs
```

---

## 🎯 Quick Reference

**Backend URL:** `https://your-backend-name.railway.app`  
**Health Check:** `https://your-backend-name.railway.app/api/health`  
**Frontend URL:** `https://your-project.vercel.app`

---

## 🚀 Next Steps

1. ✅ Variables added → Wait for deployment
2. ✅ Deployment complete → Get backend URL
3. ✅ Backend tested → Update Vercel
4. ✅ Vercel updated → Test full stack
5. ✅ Everything works → You're live! 🎉

---

## 💡 Pro Tips

1. **Bookmark your Railway dashboard** for easy access
2. **Keep backend URL handy** - you'll need it for Vercel
3. **Check logs regularly** to catch issues early
4. **Test health endpoint** after any changes
5. **Monitor Metrics tab** for usage stats

---

## ✅ You're Done!

Once all steps are complete:
- ✅ Backend is live on Railway
- ✅ Frontend is live on Vercel
- ✅ They're connected and working
- ✅ Google login is configured
- ✅ Your app is ready for users!

**Congratulations! 🎉 Your app is deployed!**

