# Vercel Setup for Monorepo (Frontend + Backend in One Repo)

## 🎯 Your Repository Structure

Your GitHub repository has:
```
your-repo/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── backend/
│   ├── src/
│   ├── server.js
│   └── ...
└── README.md
```

This is a **monorepo** - both frontend and backend in one repository.

---

## 🚀 Deploying Frontend to Vercel

### Step 1: Import Project

1. **Go to:** https://vercel.com
2. **Sign in** with GitHub
3. **Click "Add New"** → **"Project"**
4. **Import** your GitHub repository
5. **Click "Import"**

---

### Step 2: Configure Frontend

**Important Settings:**

1. **Project Name:** `itwos-ai-frontend` (or your preferred name)

2. **Framework Preset:** `Vite` (auto-detected)

3. **Root Directory:** `frontend` ⚠️ **This is important!**
   - Click **"Edit"** next to Root Directory
   - Change from `/` to `frontend`
   - This tells Vercel to look in the `frontend` folder

4. **Build Command:** `npm run build` (auto-detected)

5. **Output Directory:** `dist` (auto-detected)

6. **Install Command:** `npm install` (auto-detected)

7. **Environment Variables:** Add these (see below)

8. **Click "Deploy"**

---

### Step 3: Set Root Directory

**If you missed it in Step 2:**

1. **After deployment**, go to **Settings** tab
2. **Scroll to "General"** section
3. **Find "Root Directory"**
4. **Click "Edit"**
5. **Change to:** `frontend`
6. **Click "Save"**
7. **Redeploy** (Vercel will ask automatically)

---

## 📋 Environment Variables for Vercel

Add these in **Settings → Environment Variables**:

```
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
VITE_SERVER_URL=https://your-backend.onrender.com
```

**Replace `your-backend.onrender.com` with your actual Render backend URL!**

---

## ✅ Configuration Summary

```
Project Name: itwos-ai-frontend
Root Directory: frontend
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

---

## 🔍 Verify Root Directory

**In Vercel Dashboard:**

1. Go to **Settings** tab
2. Scroll to **"General"** section
3. Check **"Root Directory"** is set to: `frontend`
4. If not, click **"Edit"** and change it

---

## 🆘 Common Issues

### Issue 1: "Cannot find package.json"

**Problem:** Root Directory not set correctly

**Fix:**
1. Go to Settings → General
2. Set Root Directory to: `frontend`
3. Save and redeploy

---

### Issue 2: Build Fails

**Problem:** Vercel looking in wrong folder

**Fix:**
1. Check Root Directory is `frontend`
2. Verify `frontend/package.json` exists
3. Check `frontend/vite.config.js` exists
4. Check Logs tab for specific errors

---

### Issue 3: "Module not found"

**Problem:** Dependencies not installing

**Fix:**
1. Check Root Directory is `frontend`
2. Verify `frontend/package.json` has all dependencies
3. Check Build Logs for missing packages

---

## 📝 Example: Correct Configuration

**Vercel Project Settings:**

```
Name: itwos-ai-frontend
Root Directory: frontend
Framework: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**This tells Vercel:**
- Look in `frontend` folder
- Run `npm install` in `frontend` folder
- Run `npm run build` in `frontend` folder
- Use `frontend/dist` as output

---

## 🎯 Quick Setup Steps

1. **Import GitHub repo** to Vercel
2. **Set Root Directory:** `frontend`
3. **Add environment variables**
4. **Deploy!**

---

## ✅ After Deployment

Your frontend URL will be:
```
https://your-project.vercel.app
```

Use this in Render backend:
```
FRONTEND_URL=https://your-project.vercel.app
```

---

## 🔗 Related Guides

- **Environment Variables:** `COPY_PASTE_VERCEL.md`
- **Backend on Render:** `RENDER_MONOREPO_SETUP.md`
- **Complete Setup:** `RENDER_ENV_SETUP.md`

---

## 💡 Pro Tips

1. **Root Directory is critical** - Must be exactly `frontend`
2. **Case-sensitive** - Use lowercase `frontend` not `Frontend`
3. **No trailing slash** - `frontend` not `frontend/`
4. **Test locally first** - Make sure `cd frontend && npm run build` works
5. **Check build logs** - Always check if build fails

---

## ✅ You're Ready!

With Root Directory set to `frontend`, Vercel will:
- ✅ Find your `frontend/package.json`
- ✅ Install dependencies from `frontend/package.json`
- ✅ Build from `frontend` folder
- ✅ Deploy your frontend successfully!

---

## 📊 Complete Monorepo Deployment

### Backend (Render):
```
Root Directory: backend
Build Command: npm install
Start Command: npm start
URL: https://your-backend.onrender.com
```

### Frontend (Vercel):
```
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
URL: https://your-project.vercel.app
```

Both deployed from the same GitHub repository! 🎉

