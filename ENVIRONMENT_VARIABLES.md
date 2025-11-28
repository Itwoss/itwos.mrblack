# Environment Variables Guide

## Complete List of Required Environment Variables

---

## 🌐 Frontend (Vercel) Environment Variables

Add these in **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Required for Production:

```env
# Backend API URL (use your ngrok URL or Railway/Render URL)
VITE_API_URL=https://your-ngrok-url.ngrok.io/api
# OR if using Railway/Render:
# VITE_API_URL=https://your-backend.railway.app/api

# Socket.IO URL (same as backend, without /api)
VITE_SOCKET_URL=https://your-ngrok-url.ngrok.io
# OR if using Railway/Render:
# VITE_SOCKET_URL=https://your-backend.railway.app
```

### Optional (for Cloudinary uploads):

```env
# Cloudinary Configuration (if using Cloudinary for image uploads)
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
VITE_CLOUDINARY_URL=https://api.cloudinary.com/v1_1
```

---

## 🔧 Backend (Railway/Render) Environment Variables

Add these in **Railway/Render Dashboard → Your Project → Variables**

### Required:

```env
# Server Configuration
PORT=7000
NODE_ENV=production

# Database (MongoDB Atlas)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/itwos-ai

# JWT Secrets (generate strong random strings)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Frontend URL (your Vercel URL)
FRONTEND_URL=https://your-project.vercel.app

# CORS Configuration
ALLOWED_ORIGINS=https://your-project.vercel.app,https://your-project-*.vercel.app
```

### Payment (Razorpay):

```env
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### Email (Mailjet):

```env
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-api-secret
```

### File Storage (Cloudinary):

```env
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### Google OAuth (Optional):

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## 📋 Quick Setup for Testing (5 Users)

### Frontend (Vercel):

```env
VITE_API_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev/api
VITE_SOCKET_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev
```

**Note:** Replace `fitchy-asymmetrically-nigel.ngrok-free.dev` with your actual ngrok URL.

### Backend (Local with ngrok):

Keep backend running locally. No environment variables needed for local testing.

---

## 🚀 Production Setup

### Frontend (Vercel):

```env
VITE_API_URL=https://your-backend.railway.app/api
VITE_SOCKET_URL=https://your-backend.railway.app
```

### Backend (Railway/Render):

```env
PORT=7000
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/itwos-ai
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=https://your-project.vercel.app
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
MAILJET_API_KEY=your-key
MAILJET_API_SECRET=your-secret
```

---

## 📝 How to Set Environment Variables

### Vercel:

1. Go to https://vercel.com
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter variable name and value
6. Select environment (Production, Preview, Development)
7. Click **Save**
8. **Redeploy** your project

### Railway:

1. Go to https://railway.app
2. Select your project
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Enter name and value
6. Click **Add**
7. Project will auto-redeploy

### Render:

1. Go to https://render.com
2. Select your service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Enter key and value
6. Click **Save Changes**
7. Service will auto-redeploy

---

## 🔒 Security Notes

⚠️ **Never commit `.env` files to git!**

✅ **Always use environment variables in hosting platforms**

✅ **Use strong, random secrets for JWT keys**

✅ **Keep your MongoDB connection string secure**

✅ **Don't share your environment variables publicly**

---

## 🧪 Testing Environment Variables

### Check Frontend Variables:

```javascript
// In browser console
console.log(import.meta.env.VITE_API_URL)
console.log(import.meta.env.VITE_SOCKET_URL)
```

### Check Backend Variables:

```javascript
// In backend code
console.log(process.env.MONGO_URI)
console.log(process.env.FRONTEND_URL)
```

---

## 📚 Default Values

If environment variables are not set, the app uses these defaults:

### Frontend:
- `VITE_API_URL`: `http://localhost:7000/api`
- `VITE_SOCKET_URL`: `http://localhost:7000` (inferred from API URL)

### Backend:
- `PORT`: `7000`
- `NODE_ENV`: `development`

---

## ✅ Checklist

Before deploying:

- [ ] Frontend `VITE_API_URL` set to backend URL
- [ ] Frontend `VITE_SOCKET_URL` set to backend URL (without /api)
- [ ] Backend `MONGO_URI` set to MongoDB Atlas connection string
- [ ] Backend `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` set
- [ ] Backend `FRONTEND_URL` set to Vercel URL
- [ ] Backend `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` set (if using payments)
- [ ] Backend `CLOUDINARY_*` variables set (if using Cloudinary)
- [ ] Backend `MAILJET_*` variables set (if using email)
- [ ] All variables added to hosting platform
- [ ] Project redeployed after adding variables

---

## 🆘 Troubleshooting

**Frontend can't connect to backend?**
- Check `VITE_API_URL` is correct
- Check backend CORS allows your Vercel domain
- Check backend is running

**Socket.IO not working?**
- Check `VITE_SOCKET_URL` is set (without /api)
- Check backend is running
- Check WebSocket connections are allowed

**Environment variables not updating?**
- Redeploy your project after adding variables
- Clear browser cache
- Check variable names are correct (case-sensitive)

