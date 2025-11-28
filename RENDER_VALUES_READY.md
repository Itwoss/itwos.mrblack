# Render Environment Variables - Ready to Copy

## ✅ Copy These Values to Render

Go to: **Render Dashboard → Your Service → Environment Tab**

---

## Required Variables

### 1. PORT
```
Key: PORT
Value: 7000
```

### 2. NODE_ENV
```
Key: NODE_ENV
Value: production
```

### 3. MONGO_URI
```
Key: MONGO_URI
Value: mongodb+srv://username:password@cluster.mongodb.net/itwos-ai
```
**⚠️ Replace with your actual MongoDB Atlas connection string!**

### 4. JWT_ACCESS_SECRET
```
Key: JWT_ACCESS_SECRET
Value: faitsIQ2ufy2VQUcsgamYpsA5L2EgKJlwzwmBREsTlw=
```
**Generate with:** `openssl rand -base64 32`

### 5. JWT_REFRESH_SECRET
```
Key: JWT_REFRESH_SECRET
Value: 3PsjMG2AhWRG9Yi8hElrSQeuglhK4BgCgNK9/pjAO0c=
```
**Generate with:** `openssl rand -base64 32`

### 6. JWT_ACCESS_EXPIRES
```
Key: JWT_ACCESS_EXPIRES
Value: 15m
```

### 7. JWT_REFRESH_EXPIRES
```
Key: JWT_REFRESH_EXPIRES
Value: 7d
```

### 8. FRONTEND_URL
```
Key: FRONTEND_URL
Value: https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
```
**⚠️ NO trailing slash!**

### 9. GOOGLE_CLIENT_ID
```
Key: GOOGLE_CLIENT_ID
Value: your-google-client-id.apps.googleusercontent.com
```

### 10. GOOGLE_CLIENT_SECRET
```
Key: GOOGLE_CLIENT_SECRET
Value: your-google-client-secret
```

---

## 📋 Quick Copy-Paste Format

For Render, add each variable one by one:

1. Click **"Add Environment Variable"**
2. Copy the **Key** from below
3. Copy the **Value** from below
4. Click **"Save Changes"**
5. Repeat for next variable

---

## ✅ Checklist

- [ ] PORT = 7000
- [ ] NODE_ENV = production
- [ ] MONGO_URI = (your MongoDB connection string)
- [ ] JWT_ACCESS_SECRET = (generated secret)
- [ ] JWT_REFRESH_SECRET = (generated secret)
- [ ] JWT_ACCESS_EXPIRES = 15m
- [ ] JWT_REFRESH_EXPIRES = 7d
- [ ] FRONTEND_URL = https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app
- [ ] GOOGLE_CLIENT_ID = your-google-client-id.apps.googleusercontent.com
- [ ] GOOGLE_CLIENT_SECRET = your-google-client-secret

---

## 🆘 Important Notes

⚠️ **MONGO_URI:** You need to get this from MongoDB Atlas
- Go to: https://www.mongodb.com/cloud/atlas
- Create cluster (free tier available)
- Get connection string
- Replace `username` and `password` with your credentials

⚠️ **JWT Secrets:** Must be strong random strings (minimum 32 characters)
- Use `openssl rand -base64 32` to generate
- Keep these secrets secure!

⚠️ **FRONTEND_URL:** No trailing slash!
- ✅ Correct: `https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app`
- ❌ Wrong: `https://itwos-mrblack-alvou0mjj-examdodos-projects.vercel.app/`

---

## 🚀 After Adding Variables

1. Render will automatically redeploy
2. Wait 3-5 minutes
3. Check **Logs** tab for any errors
4. Test backend: `https://your-backend-name.onrender.com/api/health`

---

## 📝 MongoDB Atlas Setup (If Needed)

1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up (free tier available)
3. Create cluster
4. Go to **Database Access** → Create database user
5. Go to **Network Access** → Add IP `0.0.0.0/0` (allow all)
6. Go to **Database** → Click **Connect**
7. Choose **Connect your application**
8. Copy connection string
9. Replace `<password>` with your database user password
10. Use as `MONGO_URI` value

---

## ✅ You're Ready!

Once all variables are added, your backend will be live on Render!

Your backend URL will be:
```
https://your-backend-name.onrender.com
```

Use this URL in your Vercel frontend environment variables!

