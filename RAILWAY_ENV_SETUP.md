# Railway Environment Variables Setup Guide

## 🚂 How to Set Environment Variables in Railway

---

## Step-by-Step Instructions

### Step 1: Access Railway Dashboard

1. **Go to:** https://railway.app
2. **Sign in** with your GitHub account (or create an account)
3. **You'll see your dashboard** with your projects

---

### Step 2: Select Your Backend Project

1. **Click on your backend project** (or create a new one)
2. If you haven't created a project yet:
   - Click **"New Project"**
   - Select **"Deploy from GitHub repo"**
   - Choose your repository
   - Set **Root Directory:** `backend`

---

### Step 3: Open Variables Tab

1. **In your project dashboard**, you'll see several tabs:
   - **Deployments**
   - **Variables** ← **Click this one!**
   - **Settings**
   - **Metrics**
   - **Logs**

2. **Click on "Variables" tab**

---

### Step 4: Add Environment Variables

1. **You'll see a list of variables** (empty if first time)
2. **Click "+ New Variable"** button (top right)
3. **A popup will appear** with two fields:
   - **Key:** Enter the variable name
   - **Value:** Enter the variable value

4. **Add each variable one by one:**

---

## 📋 Complete List of Variables to Add

### Required Variables:

**1. Server Configuration:**
```
Key: PORT
Value: 7000
```

**2. Environment:**
```
Key: NODE_ENV
Value: production
```

**3. Database:**
```
Key: MONGO_URI
Value: mongodb+srv://username:password@cluster.mongodb.net/itwos-ai
```
*(Replace with your actual MongoDB Atlas connection string)*

**4. JWT Secrets:**
```
Key: JWT_ACCESS_SECRET
Value: your-super-secret-access-key-min-32-chars
```

```
Key: JWT_REFRESH_SECRET
Value: your-super-secret-refresh-key-min-32-chars
```

```
Key: JWT_ACCESS_EXPIRES
Value: 15m
```

```
Key: JWT_REFRESH_EXPIRES
Value: 7d
```

**5. Frontend URL:**
```
Key: FRONTEND_URL
Value: https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
```
*(Replace with your actual Vercel URL - NO trailing slash!)*

---

### Google OAuth (Required for Google Login):

```
Key: GOOGLE_CLIENT_ID
Value: your-google-client-id.apps.googleusercontent.com
```

```
Key: GOOGLE_CLIENT_SECRET
Value: your-google-client-secret
```

---

### Optional Variables (Add if you're using these services):

**Razorpay (Payments):**
```
Key: RAZORPAY_KEY_ID
Value: your-razorpay-key-id
```

```
Key: RAZORPAY_SECRET
Value: your-razorpay-secret
```

**Mailjet (Email):**
```
Key: MAILJET_API_KEY
Value: your-mailjet-api-key
```

```
Key: MAILJET_API_SECRET
Value: your-mailjet-api-secret
```

**Cloudinary (File Storage):**
```
Key: CLOUDINARY_CLOUD_NAME
Value: your-cloudinary-cloud-name
```

```
Key: CLOUDINARY_API_KEY
Value: your-cloudinary-api-key
```

```
Key: CLOUDINARY_API_SECRET
Value: your-cloudinary-api-secret
```

---

## 🎯 Quick Add Process

For each variable:

1. **Click "+ New Variable"**
2. **Enter Key** (variable name)
3. **Enter Value** (variable value)
4. **Click "Add"** or press Enter
5. **Repeat** for next variable

---

## ✅ After Adding Variables

1. **Railway automatically redeploys** your service
2. **Wait for deployment to complete** (you'll see it in Deployments tab)
3. **Check Logs tab** to verify everything is working
4. **Test your backend** by visiting the health endpoint

---

## 🔍 How to Verify Variables Are Set

### Method 1: Railway Dashboard

1. Go to **Variables** tab
2. You should see all your variables listed
3. Values are hidden (showing as dots) for security

### Method 2: Check Logs

1. Go to **Logs** tab
2. Look for startup messages
3. Check if your backend connects to MongoDB
4. Verify no "undefined" errors

### Method 3: Test API

Visit your Railway backend URL:
```
https://your-backend.railway.app/api/health
```

Should return:
```json
{
  "success": true,
  "message": "Server is running"
}
```

---

## 📝 Example: Adding FRONTEND_URL

1. **Click "+ New Variable"**
2. **Key:** `FRONTEND_URL`
3. **Value:** `https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app`
4. **Click "Add"**
5. **Done!** Railway will redeploy automatically

---

## 🔐 Security Notes

✅ **Values are encrypted** in Railway
✅ **Values are hidden** in the dashboard (shown as dots)
✅ **Never share** your variable values
✅ **Use strong secrets** for JWT keys (minimum 32 characters)

---

## 🆘 Troubleshooting

### Variables Not Working?

1. **Check spelling** - Variable names are case-sensitive
2. **Check for spaces** - No extra spaces before/after values
3. **Redeploy manually** - Go to Deployments → Click "Redeploy"
4. **Check logs** - Look for errors in Logs tab

### Backend Not Starting?

1. **Check required variables** - Make sure all required ones are set
2. **Check MongoDB URI** - Verify connection string is correct
3. **Check JWT secrets** - Must be set and strong
4. **Check logs** - Look for specific error messages

### Can't See Variables Tab?

1. **Make sure you're in the project** (not dashboard)
2. **Click on your service** (not the project)
3. **Variables tab should be visible**

---

## 📚 Railway Dashboard Overview

```
Railway Dashboard
├── Projects
│   └── Your Project
│       ├── Deployments (see deployment history)
│       ├── Variables ← SET VARIABLES HERE
│       ├── Settings (project settings)
│       ├── Metrics (usage stats)
│       └── Logs (view logs)
```

---

## 🎯 Quick Checklist

- [ ] Logged into Railway
- [ ] Selected backend project
- [ ] Opened Variables tab
- [ ] Added `PORT=7000`
- [ ] Added `NODE_ENV=production`
- [ ] Added `MONGO_URI` (MongoDB connection string)
- [ ] Added `JWT_ACCESS_SECRET`
- [ ] Added `JWT_REFRESH_SECRET`
- [ ] Added `FRONTEND_URL` (your Vercel URL)
- [ ] Added `GOOGLE_CLIENT_ID`
- [ ] Added `GOOGLE_CLIENT_SECRET`
- [ ] Added optional variables (if needed)
- [ ] Waited for redeployment
- [ ] Tested backend health endpoint

---

## 🔗 Important URLs

- **Railway Dashboard:** https://railway.app/dashboard
- **Railway Docs:** https://docs.railway.app
- **MongoDB Atlas:** https://www.mongodb.com/cloud/atlas

---

## 💡 Pro Tips

1. **Copy-paste values** to avoid typos
2. **Double-check** MongoDB URI format
3. **Use strong JWT secrets** (generate random strings)
4. **Keep a backup** of your variable values (securely)
5. **Test after adding** each important variable

---

## ✅ You're Done!

Once all variables are added and Railway redeploys, your backend will be ready to use!

Your backend URL will be something like:
```
https://your-backend.railway.app
```

Use this URL in your Vercel frontend environment variables!

