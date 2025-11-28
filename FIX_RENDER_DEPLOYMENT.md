# Fix Render Deployment Issues

## 🔴 Current Issues

1. **MongoDB Connection Error** - Trying to connect to `localhost:27017`
2. **Razorpay Missing** - Optional, but showing warnings

---

## ✅ Fix 1: Add MONGO_URI (CRITICAL)

### The Problem:
Your backend is trying to connect to `localhost:27017` (local MongoDB), but Render doesn't have MongoDB installed. You need MongoDB Atlas (cloud database).

### Solution: Add MONGO_URI to Render

1. **Go to:** https://dashboard.render.com
2. **Click on your backend service**
3. **Go to "Environment" tab**
4. **Click "Add Environment Variable"**
5. **Add:**

```
Key: MONGO_URI
Value: mongodb+srv://username:password@cluster.mongodb.net/itwos-ai
```

**⚠️ Replace with your actual MongoDB Atlas connection string!**

---

## 📝 How to Get MongoDB Atlas Connection String

### Step 1: Create MongoDB Atlas Account

1. **Go to:** https://www.mongodb.com/cloud/atlas
2. **Sign up** (free tier available)
3. **Create a free cluster** (M0 - Free Forever)

### Step 2: Create Database User

1. **Go to:** Database Access (left sidebar)
2. **Click "Add New Database User"**
3. **Choose "Password" authentication**
4. **Username:** `itwos-admin` (or your choice)
5. **Password:** Generate a strong password (save it!)
6. **Database User Privileges:** "Atlas admin" or "Read and write to any database"
7. **Click "Add User"**

### Step 3: Allow Network Access

1. **Go to:** Network Access (left sidebar)
2. **Click "Add IP Address"**
3. **Click "Allow Access from Anywhere"** (for testing)
   - Or add: `0.0.0.0/0`
4. **Click "Confirm"**

### Step 4: Get Connection String

1. **Go to:** Database (left sidebar)
2. **Click "Connect"** on your cluster
3. **Choose "Connect your application"**
4. **Driver:** Node.js
5. **Version:** 5.5 or later
6. **Copy the connection string:**
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 5: Create Full Connection String

**Replace `<username>` and `<password>`:**

**Original:**
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**After replacement:**
```
mongodb+srv://itwos-admin:YourPassword123@cluster0.xxxxx.mongodb.net/itwos-ai?retryWrites=true&w=majority
```

**Important:**
- Replace `<username>` with your database user (e.g., `itwos-admin`)
- Replace `<password>` with your database password
- Add database name: `/itwos-ai` (before the `?`)

**Final format:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/itwos-ai?retryWrites=true&w=majority
```

---

## ✅ Fix 2: Add MONGO_URI to Render

1. **Go to Render Dashboard**
2. **Your Service → Environment tab**
3. **Click "Add Environment Variable"**
4. **Key:** `MONGO_URI`
5. **Value:** Your MongoDB Atlas connection string
6. **Click "Save Changes"**
7. **Render will automatically redeploy**

---

## ⚠️ Fix 3: Add Razorpay (Optional - Only if using payments)

If you're using payments, add these:

1. **Go to Environment tab**
2. **Add:**

```
Key: RAZORPAY_KEY_ID
Value: your-razorpay-key-id
```

```
Key: RAZORPAY_SECRET
Value: your-razorpay-secret
```

**If you're NOT using payments, you can ignore the Razorpay warnings.**

---

## 🔍 Verify After Adding MONGO_URI

1. **Wait for redeployment** (2-3 minutes)
2. **Go to "Logs" tab**
3. **Look for:**
   - ✅ "MongoDB connected successfully"
   - ✅ "Server running on port 7000"
   - ❌ No more "MongoDB connection error"

---

## 📋 Complete Environment Variables for Render

### Required:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/itwos-ai
PORT=7000
NODE_ENV=production
JWT_ACCESS_SECRET=your-secret-min-32-chars
JWT_REFRESH_SECRET=your-secret-min-32-chars
FRONTEND_URL=https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Optional (if using):

```
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_SECRET=your-razorpay-secret
```

---

## 🆘 Troubleshooting

### Still Getting MongoDB Error?

1. **Check MONGO_URI format:**
   - ✅ Correct: `mongodb+srv://user:pass@cluster.net/itwos-ai`
   - ❌ Wrong: `mongodb://localhost:27017/itwos-ai`

2. **Check username/password:**
   - No special characters that need URL encoding
   - If password has special chars, URL encode them

3. **Check Network Access:**
   - MongoDB Atlas → Network Access
   - Should allow `0.0.0.0/0` (all IPs)

4. **Check Database User:**
   - User must have read/write permissions
   - Password must be correct

### MongoDB Connection String Format

**Correct format:**
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
```

**Example:**
```
mongodb+srv://itwos-admin:MyPass123@cluster0.abc123.mongodb.net/itwos-ai?retryWrites=true&w=majority
```

---

## ✅ After Fixing

1. **MONGO_URI added** → Wait for redeployment
2. **Check Logs** → Should see "MongoDB connected"
3. **Test health endpoint:**
   ```
   https://itwos-mrblack.onrender.com/api/health
   ```
4. **Should return:**
   ```json
   {
     "success": true,
     "message": "Server is running"
   }
   ```

---

## 🎯 Quick Fix Steps

1. **Get MongoDB Atlas connection string** (see steps above)
2. **Go to Render → Environment tab**
3. **Add MONGO_URI** with your connection string
4. **Wait for redeployment**
5. **Check Logs** - should see "MongoDB connected"

---

## 📝 MongoDB Atlas Free Tier

**Free Forever (M0):**
- 512MB storage
- Shared RAM
- Perfect for testing
- No credit card required

**Get it here:** https://www.mongodb.com/cloud/atlas

---

## ✅ You're Ready!

Once MONGO_URI is added, your backend will connect to MongoDB Atlas and work properly!

