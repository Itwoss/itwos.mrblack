# 📋 Copy & Paste: Vercel Environment Variables

## 🚀 Ready to Use - Just Replace YOUR_BACKEND_URL

---

## Step 1: Get Your Backend URL

**For Testing (ngrok):**
```bash
npx ngrok http 7000
```
Copy the URL (e.g., `https://fitchy-asymmetrically-nigel.ngrok-free.dev`)

**For Production (Railway/Render):**
Use your backend URL (e.g., `https://your-backend.railway.app`)

---

## Step 2: Copy These to Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Add These 3 Variables:

**Variable 1:**
```
Key: VITE_API_URL
Value: https://YOUR_BACKEND_URL/api
Environment: Production, Preview, Development
```

**Variable 2:**
```
Key: VITE_SOCKET_URL
Value: https://YOUR_BACKEND_URL
Environment: Production, Preview, Development
```

**Variable 3:**
```
Key: VITE_SERVER_URL
Value: https://YOUR_BACKEND_URL
Environment: Production, Preview, Development
```

---

## 📝 Example Values

**If your backend URL is:** `https://fitchy-asymmetrically-nigel.ngrok-free.dev`

Then set:
```
VITE_API_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev/api
VITE_SOCKET_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev
VITE_SERVER_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev
```

**If your backend URL is:** `https://your-backend.railway.app`

Then set:
```
VITE_API_URL=https://your-backend.railway.app/api
VITE_SOCKET_URL=https://your-backend.railway.app
VITE_SERVER_URL=https://your-backend.railway.app
```

---

## ✅ After Adding Variables

1. **Go to Deployments tab**
2. **Click ⋯ (three dots) on latest deployment**
3. **Click Redeploy**
4. **Wait for deployment to complete**
5. **Visit your site and test!**

---

## 🔐 For Google Login

**Backend needs these (Railway/Render):**

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
FRONTEND_URL=https://your-project.vercel.app
```

**See `GOOGLE_LOGIN_SETUP.md` for complete Google OAuth setup.**

---

## 🎯 Quick Checklist

- [ ] Backend URL copied
- [ ] `VITE_API_URL` added to Vercel
- [ ] `VITE_SOCKET_URL` added to Vercel
- [ ] `VITE_SERVER_URL` added to Vercel
- [ ] All set to Production, Preview, Development
- [ ] Project redeployed
- [ ] Site tested

---

## 🆘 Need Help?

- **Vercel Dashboard:** https://vercel.com/dashboard
- **See:** `GOOGLE_LOGIN_SETUP.md` for Google OAuth
- **See:** `VERCEL_ENV_VARIABLES.md` for detailed guide

