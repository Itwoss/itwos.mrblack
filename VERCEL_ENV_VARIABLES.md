# Vercel Environment Variables - Ready to Copy & Paste

## 🚀 Quick Setup for Vercel Deployment

Copy these variables and paste them into **Vercel Dashboard → Your Project → Settings → Environment Variables**

---

## 📋 Frontend Environment Variables (Vercel)

### Step 1: Get Your Backend URL

**Option A: Using ngrok (for testing)**
```bash
npx ngrok http 7000
```
Copy the URL (e.g., `https://fitchy-asymmetrically-nigel.ngrok-free.dev`)

**Option B: Using Railway/Render (for production)**
Use your backend URL (e.g., `https://your-backend.railway.app`)

---

### Step 2: Copy These Variables to Vercel

Replace `YOUR_BACKEND_URL` with your actual backend URL:

```env
VITE_API_URL=https://YOUR_BACKEND_URL/api
VITE_SOCKET_URL=https://YOUR_BACKEND_URL
VITE_SERVER_URL=https://YOUR_BACKEND_URL
```

**Example with ngrok:**
```env
VITE_API_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev/api
VITE_SOCKET_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev
VITE_SERVER_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev
```

**Example with Railway:**
```env
VITE_API_URL=https://your-backend.railway.app/api
VITE_SOCKET_URL=https://your-backend.railway.app
VITE_SERVER_URL=https://your-backend.railway.app
```

---

## 🔐 Google OAuth Configuration

### Step 1: Get Google OAuth Credentials

1. Go to: https://console.cloud.google.com/
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Authorized JavaScript origins:
   - `https://your-project.vercel.app`
   - `https://your-project-*.vercel.app` (for preview deployments)
7. Authorized redirect URIs:
   - `https://your-project.vercel.app/auth/google/callback`
   - `https://your-backend-url.com/api/auth/google/callback`
8. Copy **Client ID** and **Client Secret**

---

### Step 2: Add Google OAuth to Backend

**Backend Environment Variables (Railway/Render):**

```env
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

**Note:** Google OAuth is configured in the backend, not frontend.

---

## 📝 Complete Vercel Environment Variables List

### Copy this entire block to Vercel:

```
VITE_API_URL=https://YOUR_BACKEND_URL/api
VITE_SOCKET_URL=https://YOUR_BACKEND_URL
VITE_SERVER_URL=https://YOUR_BACKEND_URL
```

---

## 🎯 Step-by-Step: Add to Vercel

1. **Go to:** https://vercel.com
2. **Select your project**
3. **Click:** Settings → Environment Variables
4. **Click:** Add New
5. **For each variable:**
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-backend-url.com/api`
   - **Environment:** Select all (Production, Preview, Development)
   - **Click:** Save
6. **Repeat for:**
   - `VITE_SOCKET_URL`
   - `VITE_SERVER_URL`
7. **After adding all variables:**
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**

---

## 🔧 Backend Environment Variables (Railway/Render)

### Required for Google Login:

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=https://your-project.vercel.app
```

### Complete Backend Variables:

```env
# Server
PORT=7000
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/itwos-ai

# JWT
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Frontend URL (your Vercel URL)
FRONTEND_URL=https://your-project.vercel.app

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Payments (if using)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_SECRET=your-razorpay-secret

# Email (if using)
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-api-secret

# Cloudinary (if using)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

---

## ✅ Quick Checklist

### Frontend (Vercel):
- [ ] `VITE_API_URL` added
- [ ] `VITE_SOCKET_URL` added
- [ ] `VITE_SERVER_URL` added
- [ ] All set to Production, Preview, Development
- [ ] Project redeployed

### Backend (Railway/Render):
- [ ] `GOOGLE_CLIENT_ID` added
- [ ] `GOOGLE_CLIENT_SECRET` added
- [ ] `FRONTEND_URL` set to your Vercel URL
- [ ] Google OAuth redirect URI configured in Google Console

---

## 🧪 Test Google Login

1. Deploy frontend to Vercel
2. Visit your Vercel URL
3. Click "Sign in with Google"
4. Should redirect to Google login
5. After login, should redirect back to your site

---

## 🆘 Troubleshooting

**Google login not working?**
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend
- Check redirect URI in Google Console matches backend URL
- Check `FRONTEND_URL` in backend matches your Vercel URL
- Check CORS allows your Vercel domain

**Frontend can't connect to backend?**
- Check `VITE_API_URL` is correct
- Check backend is running
- Check backend CORS allows Vercel domain

---

## 📚 Next Steps

1. ✅ Add variables to Vercel
2. ✅ Configure Google OAuth in Google Console
3. ✅ Add Google credentials to backend
4. ✅ Redeploy frontend
5. ✅ Test Google login

---

## 🔗 Important URLs

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Google Cloud Console:** https://console.cloud.google.com/
- **Railway Dashboard:** https://railway.app/dashboard
- **Render Dashboard:** https://dashboard.render.com/

