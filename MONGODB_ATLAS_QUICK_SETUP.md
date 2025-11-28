# MongoDB Atlas Quick Setup (5 Minutes)

## 🚀 Get Your MongoDB Connection String

---

## Step 1: Sign Up (2 minutes)

1. **Go to:** https://www.mongodb.com/cloud/atlas
2. **Click "Try Free"** or **"Sign Up"**
3. **Sign up** with Google, GitHub, or Email
4. **Choose:** "Build an application" → "M0 Free" (Free Forever)
5. **Select:** AWS, Google Cloud, or Azure (any region)
6. **Click "Create"**

---

## Step 2: Create Database User (1 minute)

1. **Go to:** Database Access (left sidebar)
2. **Click "Add New Database User"**
3. **Authentication Method:** Password
4. **Username:** `itwos-admin`
5. **Password:** Click "Autogenerate Secure Password" (copy it!)
6. **Database User Privileges:** "Atlas admin"
7. **Click "Add User"**

**⚠️ Save the password! You'll need it for the connection string.**

---

## Step 3: Allow Network Access (30 seconds)

1. **Go to:** Network Access (left sidebar)
2. **Click "Add IP Address"**
3. **Click "Allow Access from Anywhere"**
   - This adds: `0.0.0.0/0`
4. **Click "Confirm"**

---

## Step 4: Get Connection String (1 minute)

1. **Go to:** Database (left sidebar)
2. **Click "Connect"** on your cluster
3. **Choose:** "Connect your application"
4. **Driver:** Node.js
5. **Version:** 5.5 or later
6. **Copy the connection string:**
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

---

## Step 5: Create Full Connection String (30 seconds)

**Replace in the connection string:**

1. **Replace `<username>`** with: `itwos-admin` (or your username)
2. **Replace `<password>`** with: Your password (the one you saved)
3. **Add database name** before the `?`:
   - Change: `mongodb.net/?`
   - To: `mongodb.net/itwos-ai?`

**Example:**

**Before:**
```
mongodb+srv://<username>:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

**After:**
```
mongodb+srv://itwos-admin:MyPassword123@cluster0.abc123.mongodb.net/itwos-ai?retryWrites=true&w=majority
```

---

## Step 6: Add to Render

1. **Go to:** Render Dashboard → Your Service → Environment
2. **Click "Add Environment Variable"**
3. **Key:** `MONGO_URI`
4. **Value:** Your full connection string (from Step 5)
5. **Click "Save Changes"**

---

## ✅ Done!

Render will automatically redeploy. Wait 2-3 minutes, then check Logs tab - you should see "MongoDB connected successfully"!

---

## 🔍 Verify Connection

**After deployment, check Logs tab:**

**Should see:**
```
✅ MongoDB connected successfully
🚀 Server running on port 7000
```

**Should NOT see:**
```
❌ MongoDB connection error
❌ connect ECONNREFUSED
```

---

## 🆘 Troubleshooting

### Connection String Not Working?

1. **Check username/password** - No typos
2. **Check special characters** - If password has `@`, `#`, etc., URL encode them
3. **Check database name** - Should be `/itwos-ai` before the `?`
4. **Check Network Access** - Should allow `0.0.0.0/0`

### Password Has Special Characters?

**URL encode them:**
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`

**Or use a simple password** without special characters.

---

## 📝 Quick Reference

**Connection String Format:**
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
```

**Your Values:**
- USERNAME: `itwos-admin` (or your username)
- PASSWORD: Your database password
- CLUSTER: `cluster0.xxxxx` (from Atlas)
- DATABASE_NAME: `itwos-ai`

---

## ✅ Checklist

- [ ] MongoDB Atlas account created
- [ ] Free cluster created (M0)
- [ ] Database user created
- [ ] Network access allowed (0.0.0.0/0)
- [ ] Connection string copied
- [ ] Username and password replaced
- [ ] Database name added (`/itwos-ai`)
- [ ] MONGO_URI added to Render
- [ ] Render redeployed
- [ ] Logs show "MongoDB connected"

---

## 🎯 You're Ready!

Once MONGO_URI is added to Render, your backend will connect to MongoDB Atlas and work perfectly!

