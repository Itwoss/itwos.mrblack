# Railway Quick Start - Environment Variables

## 🚀 5-Minute Setup

---

## Step 1: Go to Railway

1. Visit: https://railway.app
2. Sign in with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your repository
5. Set **Root Directory:** `backend`

---

## Step 2: Add Variables

Click **"Variables"** tab, then add these:

### Copy & Paste These:

```
PORT=7000
NODE_ENV=production
MONGO_URI=your-mongodb-connection-string
JWT_ACCESS_SECRET=your-secret-min-32-chars
JWT_REFRESH_SECRET=your-secret-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
FRONTEND_URL=https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**For each variable:**
1. Click **"+ New Variable"**
2. Paste **Key** (left side)
3. Paste **Value** (right side)
4. Click **"Add"**

---

## Step 3: Wait for Deployment

Railway will automatically redeploy. Wait 2-3 minutes.

---

## Step 4: Get Your Backend URL

1. Go to **Settings** tab
2. Find **"Public Domain"**
3. Copy the URL (e.g., `https://your-backend.railway.app`)

---

## Step 5: Update Vercel

Add to Vercel environment variables:

```
VITE_API_URL=https://your-backend.railway.app/api
VITE_SOCKET_URL=https://your-backend.railway.app
VITE_SERVER_URL=https://your-backend.railway.app
```

---

## ✅ Done!

Your backend is now live on Railway!

---

## 🆘 Need Help?

See `RAILWAY_ENV_SETUP.md` for detailed instructions.

