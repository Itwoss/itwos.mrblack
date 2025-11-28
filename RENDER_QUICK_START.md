# Render Quick Start - Environment Variables

## 🚀 5-Minute Setup

---

## Step 1: Go to Render

1. Visit: https://render.com
2. Sign in with GitHub
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository
5. Configure:
   - **Name:** `itwos-ai-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Click **"Create Web Service"**

---

## Step 2: Add Variables

1. **Click "Environment" tab**
2. **Click "Add Environment Variable"**
3. **Add these one by one:**

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
1. Click **"Add Environment Variable"**
2. Paste **Key** (left side)
3. Paste **Value** (right side)
4. Click **"Save Changes"**

---

## Step 3: Wait for Deployment

Render will automatically redeploy. Wait 3-5 minutes.

---

## Step 4: Get Your Backend URL

1. Go to **Settings** tab
2. Find **"Service URL"** or **"Custom Domain"**
3. Copy the URL (e.g., `https://your-backend-name.onrender.com`)

---

## Step 5: Update Vercel

Add to Vercel environment variables:

```
VITE_API_URL=https://your-backend-name.onrender.com/api
VITE_SOCKET_URL=https://your-backend-name.onrender.com
VITE_SERVER_URL=https://your-backend-name.onrender.com
```

---

## ✅ Done!

Your backend is now live on Render!

---

## ⚠️ Important: Free Tier Sleep

**Render free tier services sleep after 15 minutes of inactivity.**

**First request after sleep:**
- Takes ~30 seconds (cold start)
- Then works normally

**To avoid sleep:**
- Upgrade to paid plan ($7/month)
- Service stays awake 24/7

---

## 🆘 Need Help?

See `RENDER_ENV_SETUP.md` for detailed instructions.

