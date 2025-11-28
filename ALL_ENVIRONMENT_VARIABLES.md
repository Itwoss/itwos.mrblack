# Complete Environment Variables List

## 📋 All Environment Variables for Your Project

---

## 🌐 Frontend Environment Variables (Vercel)

### Required:

```env
# Backend API URL
VITE_API_URL=https://your-ngrok-url.ngrok.io/api
# OR for production:
# VITE_API_URL=https://your-backend.railway.app/api

# Socket.IO Server URL (without /api)
VITE_SOCKET_URL=https://your-ngrok-url.ngrok.io
# OR for production:
# VITE_SOCKET_URL=https://your-backend.railway.app

# Alternative Socket URL (used in some components)
VITE_SERVER_URL=https://your-ngrok-url.ngrok.io
# OR for production:
# VITE_SERVER_URL=https://your-backend.railway.app
```

### Optional (Cloudinary):

```env
# Cloudinary Configuration (if using Cloudinary for uploads)
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=itwos-ai
VITE_CLOUDINARY_URL=https://api.cloudinary.com/v1_1
```

### Development Only:

```env
# Vite automatically sets these in development
VITE_DEV=true (auto-set)
```

---

## 🔧 Backend Environment Variables (Railway/Render/Local)

### Server Configuration (Required):

```env
# Server Port
PORT=7000

# Environment Mode
NODE_ENV=development
# OR for production:
# NODE_ENV=production
```

### Database (Required):

```env
# MongoDB Connection String
MONGO_URI=mongodb://localhost:27017/itwos-ai
# OR for production (MongoDB Atlas):
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/itwos-ai

# Alternative (also supported):
MONGODB_URI=mongodb://localhost:27017/itwos-ai
# OR for production:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/itwos-ai
```

### JWT Authentication (Required):

```env
# JWT Access Token Secret (minimum 32 characters recommended)
JWT_ACCESS_SECRET=your-super-secret-access-key-here-min-32-chars

# JWT Refresh Token Secret (minimum 32 characters recommended)
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-min-32-chars

# JWT Access Token Expiration
JWT_ACCESS_EXPIRES=15m

# JWT Refresh Token Expiration
JWT_REFRESH_EXPIRES=7d
```

### Frontend/Backend URLs (Required):

```env
# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:5173
# OR for production:
# FRONTEND_URL=https://your-project.vercel.app

# Backend URL (optional, defaults to localhost:7000)
BACKEND_URL=http://localhost:7000
# OR for production:
# BACKEND_URL=https://your-backend.railway.app
```

### CORS Configuration (Optional):

```env
# Allowed Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
# OR for production:
# ALLOWED_ORIGINS=https://your-project.vercel.app,https://your-project-*.vercel.app
```

### Razorpay Payment (Required if using payments):

```env
# Razorpay Key ID
RAZORPAY_KEY_ID=your-razorpay-key-id

# Razorpay Secret Key
RAZORPAY_SECRET=your-razorpay-secret
# OR (alternative name):
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### Mailjet Email Service (Required if using emails):

```env
# Mailjet API Key
MAILJET_API_KEY=your-mailjet-api-key

# Mailjet API Secret
MAILJET_API_SECRET=your-mailjet-api-secret
```

### Cloudinary File Storage (Required if using Cloudinary):

```env
# Cloudinary Cloud Name
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name

# Cloudinary API Key
CLOUDINARY_API_KEY=your-cloudinary-api-key

# Cloudinary API Secret
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### Google OAuth (Optional):

```env
# Google OAuth Client ID
GOOGLE_CLIENT_ID=your-google-client-id

# Google OAuth Client Secret
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Vercel Integration (Auto-set by Vercel):

```env
# Automatically set by Vercel (don't set manually)
VERCEL_URL=your-project.vercel.app (auto-set)
```

---

## 📝 Complete .env File Template

### Frontend (.env.local or Vercel Environment Variables):

```env
# ============================================
# FRONTEND ENVIRONMENT VARIABLES
# ============================================

# Backend API URL
VITE_API_URL=https://your-ngrok-url.ngrok.io/api

# Socket.IO URL
VITE_SOCKET_URL=https://your-ngrok-url.ngrok.io

# Alternative Socket URL
VITE_SERVER_URL=https://your-ngrok-url.ngrok.io

# Cloudinary (Optional)
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=itwos-ai
VITE_CLOUDINARY_URL=https://api.cloudinary.com/v1_1
```

### Backend (.env file):

```env
# ============================================
# BACKEND ENVIRONMENT VARIABLES
# ============================================

# Server Configuration
PORT=7000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/itwos-ai
# OR for production:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/itwos-ai

# JWT Secrets
JWT_ACCESS_SECRET=your-super-secret-access-key-here-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Frontend/Backend URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:7000

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_SECRET=your-razorpay-secret

# Mailjet Configuration
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-api-secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## 🚀 Quick Setup for Testing (5 Users)

### Frontend (Vercel):

```env
VITE_API_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev/api
VITE_SOCKET_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev
VITE_SERVER_URL=https://fitchy-asymmetrically-nigel.ngrok-free.dev
```

**Replace with your actual ngrok URL!**

### Backend (Local - No .env needed for basic testing):

Keep backend running locally. Default values will be used.

---

## 🏭 Production Setup

### Frontend (Vercel):

```env
VITE_API_URL=https://your-backend.railway.app/api
VITE_SOCKET_URL=https://your-backend.railway.app
VITE_SERVER_URL=https://your-backend.railway.app
```

### Backend (Railway/Render):

```env
PORT=7000
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/itwos-ai
JWT_ACCESS_SECRET=generate-strong-random-secret-min-32-chars
JWT_REFRESH_SECRET=generate-strong-random-secret-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
FRONTEND_URL=https://your-project.vercel.app
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_SECRET=your-razorpay-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-api-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## 📊 Summary by Category

### Frontend (3 Required + 3 Optional):
- ✅ `VITE_API_URL` (Required)
- ✅ `VITE_SOCKET_URL` (Required)
- ✅ `VITE_SERVER_URL` (Required - used in some components)
- ⚪ `VITE_CLOUDINARY_CLOUD_NAME` (Optional)
- ⚪ `VITE_CLOUDINARY_UPLOAD_PRESET` (Optional)
- ⚪ `VITE_CLOUDINARY_URL` (Optional)

### Backend (8 Required + 6 Optional):
- ✅ `PORT` (Required)
- ✅ `NODE_ENV` (Required)
- ✅ `MONGO_URI` or `MONGODB_URI` (Required)
- ✅ `JWT_ACCESS_SECRET` (Required)
- ✅ `JWT_REFRESH_SECRET` (Required)
- ✅ `JWT_ACCESS_EXPIRES` (Required)
- ✅ `JWT_REFRESH_EXPIRES` (Required)
- ✅ `FRONTEND_URL` (Required)
- ⚪ `BACKEND_URL` (Optional)
- ⚪ `ALLOWED_ORIGINS` (Optional)
- ⚪ `RAZORPAY_KEY_ID` (Optional - if using payments)
- ⚪ `RAZORPAY_SECRET` (Optional - if using payments)
- ⚪ `MAILJET_API_KEY` (Optional - if using emails)
- ⚪ `MAILJET_API_SECRET` (Optional - if using emails)
- ⚪ `CLOUDINARY_CLOUD_NAME` (Optional - if using Cloudinary)
- ⚪ `CLOUDINARY_API_KEY` (Optional - if using Cloudinary)
- ⚪ `CLOUDINARY_API_SECRET` (Optional - if using Cloudinary)
- ⚪ `GOOGLE_CLIENT_ID` (Optional - if using Google OAuth)
- ⚪ `GOOGLE_CLIENT_SECRET` (Optional - if using Google OAuth)

---

## 🔐 Security Notes

⚠️ **Never commit `.env` files to git!**

✅ **Always use environment variables in hosting platforms**

✅ **Use strong, random secrets for JWT keys (minimum 32 characters)**

✅ **Keep your MongoDB connection string secure**

✅ **Don't share your environment variables publicly**

✅ **Rotate secrets regularly in production**

---

## 🧪 Testing Your Environment Variables

### Frontend:

```javascript
// In browser console
console.log('API URL:', import.meta.env.VITE_API_URL)
console.log('Socket URL:', import.meta.env.VITE_SOCKET_URL)
console.log('Server URL:', import.meta.env.VITE_SERVER_URL)
```

### Backend:

```javascript
// In backend code
console.log('MongoDB URI:', process.env.MONGO_URI)
console.log('Frontend URL:', process.env.FRONTEND_URL)
console.log('Node Env:', process.env.NODE_ENV)
```

---

## ✅ Checklist

### Frontend:
- [ ] `VITE_API_URL` set
- [ ] `VITE_SOCKET_URL` set
- [ ] `VITE_SERVER_URL` set (if using components that need it)
- [ ] Cloudinary variables set (if using Cloudinary)

### Backend:
- [ ] `PORT` set
- [ ] `NODE_ENV` set
- [ ] `MONGO_URI` or `MONGODB_URI` set
- [ ] `JWT_ACCESS_SECRET` set (strong secret)
- [ ] `JWT_REFRESH_SECRET` set (strong secret)
- [ ] `FRONTEND_URL` set
- [ ] Payment variables set (if using payments)
- [ ] Email variables set (if using emails)
- [ ] Cloudinary variables set (if using Cloudinary)
- [ ] Google OAuth variables set (if using Google login)

---

## 📚 Default Values

If environment variables are not set, these defaults are used:

### Frontend:
- `VITE_API_URL`: `http://localhost:7000/api`
- `VITE_SOCKET_URL`: `http://localhost:7000`
- `VITE_SERVER_URL`: `http://localhost:7000`
- `VITE_CLOUDINARY_UPLOAD_PRESET`: `itwos-ai`
- `VITE_CLOUDINARY_URL`: `https://api.cloudinary.com/v1_1`

### Backend:
- `PORT`: `7000`
- `NODE_ENV`: `development`
- `MONGO_URI` or `MONGODB_URI`: `mongodb://localhost:27017/itwos-ai`
- `JWT_ACCESS_EXPIRES`: `15m`
- `JWT_REFRESH_EXPIRES`: `7d`

---

## 🆘 Need Help?

- See `ENVIRONMENT_VARIABLES.md` for detailed explanations
- See `QUICK_ENV_SETUP.md` for quick testing setup
- Check your hosting platform documentation for setting environment variables

