# Render Setup for Monorepo (Frontend + Backend in One Repo)

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
│   ├── package.json
│   └── ...
└── README.md
```

This is called a **monorepo** (mono = one repository).

---

## 🚀 Deploying Backend to Render

### Step 1: Create Web Service

1. **Go to:** https://render.com
2. **Sign in** with GitHub
3. **Click "New +"** → **"Web Service"**
4. **Click "Connect account"** (if not connected)
5. **Select "Build and deploy from a Git repository"**
6. **Choose your GitHub repository**
7. **Click "Connect"**

---

### Step 2: Configure Backend Service

**Important Settings:**

1. **Name:** `itwos-ai-backend` (or your preferred name)

2. **Region:** Choose closest to you

3. **Branch:** `main` (or your default branch)

4. **Root Directory:** `backend` ⚠️ **This is important!**
   - This tells Render to look in the `backend` folder
   - Type exactly: `backend`

5. **Runtime:** `Node`

6. **Build Command:** `npm install`
   - Render will run this in the `backend` folder

7. **Start Command:** `npm start`
   - Render will run this to start your server

8. **Environment:** `Node`

9. **Node Version:** `18` or `20` (check your package.json)

10. **Click "Create Web Service"**

---

### Step 3: Add Environment Variables

1. **After service is created**, go to **"Environment" tab**
2. **Click "Add Environment Variable"**
3. **Add all required variables** (see `RENDER_VALUES_READY.md`)

---

## ✅ Configuration Summary

```
Service Name: itwos-ai-backend
Root Directory: backend
Build Command: npm install
Start Command: npm start
Runtime: Node
```

---

## 🔍 Verify Root Directory

**In Render Dashboard:**

1. Go to **Settings** tab
2. Scroll to **"Build & Deploy"** section
3. Check **"Root Directory"** is set to: `backend`
4. If not, click **"Edit"** and change it

---

## 📋 Complete Setup Checklist

### Render Backend Service:
- [ ] Service created
- [ ] Root Directory set to `backend`
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] All environment variables added
- [ ] Service deployed successfully
- [ ] Health check works: `https://your-backend.onrender.com/api/health`

### Vercel Frontend:
- [ ] Project created
- [ ] Root Directory set to `frontend`
- [ ] Environment variables added
- [ ] Frontend deployed successfully

---

## 🆘 Common Issues

### Issue 1: "Cannot find package.json"

**Problem:** Root Directory not set correctly

**Fix:**
1. Go to Settings → Build & Deploy
2. Set Root Directory to: `backend`
3. Save and redeploy

---

### Issue 2: "Module not found"

**Problem:** Build command not installing dependencies

**Fix:**
1. Check Root Directory is `backend`
2. Verify Build Command is `npm install`
3. Check Logs tab for errors

---

### Issue 3: "Port already in use"

**Problem:** Render assigns port automatically

**Fix:**
- Your backend should use: `process.env.PORT || 7000`
- Render sets `PORT` automatically
- Don't hardcode port 7000

---

### Issue 4: Build Fails

**Check:**
1. Root Directory is `backend`
2. `backend/package.json` exists
3. `backend/server.js` exists
4. All dependencies are in `package.json`

---

## 📝 Example: Correct Configuration

**Render Service Settings:**

```
Name: itwos-ai-backend
Root Directory: backend
Build Command: npm install
Start Command: npm start
Environment: Node
Node Version: 20
```

**This tells Render:**
- Look in `backend` folder
- Run `npm install` to install dependencies
- Run `npm start` to start the server

---

## 🎯 Quick Setup Steps

1. **Create Web Service** in Render
2. **Connect GitHub repo**
3. **Set Root Directory:** `backend`
4. **Set Build Command:** `npm install`
5. **Set Start Command:** `npm start`
6. **Add environment variables**
7. **Deploy!**

---

## ✅ After Deployment

Your backend URL will be:
```
https://your-backend-name.onrender.com
```

Use this in Vercel:
```
VITE_API_URL=https://your-backend-name.onrender.com/api
VITE_SOCKET_URL=https://your-backend-name.onrender.com
VITE_SERVER_URL=https://your-backend-name.onrender.com
```

---

## 🔗 Related Guides

- **Environment Variables:** `RENDER_VALUES_READY.md`
- **Quick Start:** `RENDER_QUICK_START.md`
- **Detailed Setup:** `RENDER_ENV_SETUP.md`

---

## 💡 Pro Tips

1. **Root Directory is critical** - Must be exactly `backend`
2. **Case-sensitive** - Use lowercase `backend` not `Backend`
3. **No trailing slash** - `backend` not `backend/`
4. **Test locally first** - Make sure `cd backend && npm start` works
5. **Check logs** - Always check Logs tab if something fails

---

## ✅ You're Ready!

With Root Directory set to `backend`, Render will:
- ✅ Find your `backend/package.json`
- ✅ Install dependencies from `backend/package.json`
- ✅ Run `npm start` from `backend` folder
- ✅ Deploy your backend successfully!

