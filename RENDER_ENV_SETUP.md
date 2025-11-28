# Render Environment Variables Setup Guide

## 🎨 How to Set Environment Variables in Render

---

## Step-by-Step Instructions

### Step 1: Access Render Dashboard

1. **Go to:** https://render.com
2. **Sign up** with your GitHub account (or create an account)
3. **You'll see your dashboard** with your services

---

### Step 2: Create or Select Your Backend Service

1. **If you haven't created a service yet:**
   - Click **"New +"** button (top right)
   - Select **"Web Service"**
   - Click **"Connect account"** (if not connected)
   - Select **"Build and deploy from a Git repository"**
   - Choose your GitHub repository
   - Click **"Connect"**

2. **Configure the service:**
   - **Name:** `itwos-ai-backend` (or your preferred name)
   - **Region:** Choose closest to you
   - **Branch:** `main` (or your default branch)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Click "Create Web Service"**

3. **If service already exists:**
   - Click on your backend service from the dashboard

---

### Step 3: Open Environment Tab

1. **In your service dashboard**, you'll see tabs:
   - **Logs**
   - **Metrics**
   - **Environment** ← **Click this one!**
   - **Settings**
   - **Events**

2. **Click on "Environment" tab**

---

### Step 4: Add Environment Variables

1. **You'll see a section called "Environment Variables"**
2. **Click "Add Environment Variable"** button
3. **A form will appear:**
   - **Key:** Enter the variable name
   - **Value:** Enter the variable value
   - **Click "Save Changes"**

4. **Add each variable one by one**

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

1. **Click "Add Environment Variable"**
2. **Enter Key** (variable name)
3. **Enter Value** (variable value)
4. **Click "Save Changes"**
5. **Repeat** for next variable

**Note:** Render will automatically redeploy after you save changes!

---

## ✅ After Adding Variables

1. **Render automatically redeploys** your service
2. **Go to "Events" tab** to see deployment progress
3. **Wait for deployment to complete** (2-5 minutes)
4. **Check "Logs" tab** to verify everything is working
5. **Test your backend** by visiting the health endpoint

---

## 🔍 How to Verify Variables Are Set

### Method 1: Render Dashboard

1. Go to **Environment** tab
2. You should see all your variables listed
3. Values are hidden (showing as dots) for security
4. Click on a variable to edit it

### Method 2: Check Logs

1. Go to **Logs** tab
2. Look for startup messages
3. Check if your backend connects to MongoDB
4. Verify no "undefined" errors

### Method 3: Test API

Visit your Render backend URL:
```
https://your-backend-name.onrender.com/api/health
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

1. **Click "Add Environment Variable"**
2. **Key:** `FRONTEND_URL`
3. **Value:** `https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app`
4. **Click "Save Changes"**
5. **Done!** Render will redeploy automatically

---

## 🔐 Security Notes

✅ **Values are encrypted** in Render
✅ **Values are hidden** in the dashboard (shown as dots)
✅ **Never share** your variable values
✅ **Use strong secrets** for JWT keys (minimum 32 characters)

---

## 🆘 Troubleshooting

### Variables Not Working?

1. **Check spelling** - Variable names are case-sensitive
2. **Check for spaces** - No extra spaces before/after values
3. **Redeploy manually** - Go to Events → Click "Manual Deploy"
4. **Check logs** - Look for errors in Logs tab

### Backend Not Starting?

1. **Check required variables** - Make sure all required ones are set
2. **Check MongoDB URI** - Verify connection string is correct
3. **Check JWT secrets** - Must be set and strong
4. **Check logs** - Look for specific error messages

### Can't See Environment Tab?

1. **Make sure you're in the service** (not dashboard)
2. **Click on your service name** from dashboard
3. **Environment tab should be visible**

### Deployment Failing?

1. **Check Logs tab** for error messages
2. **Verify build command:** `npm install`
3. **Verify start command:** `npm start`
4. **Check Root Directory:** Should be `backend`

---

## 📚 Render Dashboard Overview

```
Render Dashboard
├── Dashboard (all services)
│   └── Your Service
│       ├── Logs (view logs)
│       ├── Metrics (usage stats)
│       ├── Environment ← SET VARIABLES HERE
│       ├── Settings (service settings)
│       └── Events (deployment history)
```

---

## 🎯 Quick Checklist

- [ ] Logged into Render
- [ ] Created or selected backend service
- [ ] Opened Environment tab
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

- **Render Dashboard:** https://dashboard.render.com
- **Render Docs:** https://render.com/docs
- **MongoDB Atlas:** https://www.mongodb.com/cloud/atlas

---

## 💡 Pro Tips

1. **Copy-paste values** to avoid typos
2. **Double-check** MongoDB URI format
3. **Use strong JWT secrets** (generate random strings)
4. **Keep a backup** of your variable values (securely)
5. **Test after adding** each important variable
6. **Monitor Logs tab** regularly

---

## 🆚 Render vs Railway

**Render Advantages:**
- ✅ Free tier with 750 hours/month
- ✅ Automatic HTTPS
- ✅ Easy Git integration
- ✅ Simple dashboard
- ✅ Good for small to medium projects

**Render Free Tier Limits:**
- ⚠️ Services sleep after 15 minutes of inactivity
- ⚠️ First request after sleep takes ~30 seconds (cold start)
- ⚠️ 750 hours/month total

**To avoid sleep (paid):**
- Upgrade to paid plan ($7/month per service)
- Services stay awake 24/7

---

## ✅ You're Done!

Once all variables are added and Render redeploys, your backend will be ready to use!

Your backend URL will be something like:
```
https://your-backend-name.onrender.com
```

Use this URL in your Vercel frontend environment variables!

