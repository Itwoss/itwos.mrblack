# How to Set Root Directory in Render

## 🎯 Step-by-Step: Setting Root Directory to `backend`

---

## Step 1: Select Your Repository

1. **You're currently on the "Configure" step** (Step 2)
2. **In the "Source Code" section**, you should see your repositories
3. **Click on:** `Itwoss / itwos.mrblack`
4. **This will select your repository**

---

## Step 2: Continue to Configuration

1. **After selecting the repository**, click **"Continue"** or **"Next"** button
2. **You'll see the configuration form** with these fields:
   - Name
   - Region
   - Branch
   - **Root Directory** ← This is what you need!
   - Build Command
   - Start Command
   - etc.

---

## Step 3: Find Root Directory Field

**In the configuration form, look for:**

```
┌─────────────────────────────────┐
│ Root Directory                  │
│ ┌─────────────────────────────┐ │
│ │ /                            │ │ ← This field
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Or it might look like:**

```
Root Directory: [________________] 
                 (text input field)
```

---

## Step 4: Set Root Directory to `backend`

1. **Click in the Root Directory field**
2. **Clear any existing value** (if it shows `/` or is empty)
3. **Type exactly:** `backend`
   - ✅ Correct: `backend`
   - ❌ Wrong: `Backend` (capital B)
   - ❌ Wrong: `backend/` (with slash)
   - ❌ Wrong: `/backend` (with leading slash)
4. **Press Enter or click outside the field**

---

## Step 5: Complete Other Settings

**While you're here, also set:**

1. **Name:** `itwos-ai-backend` (or your preferred name)

2. **Region:** Choose closest to you

3. **Branch:** `main` (or your default branch)

4. **Root Directory:** `backend` ✅ (you just set this)

5. **Build Command:** `npm install`

6. **Start Command:** `npm start`

7. **Runtime:** `Node`

---

## Step 6: Create Service

1. **After setting all fields**, scroll down
2. **Click "Create Web Service"** button
3. **Render will start deploying!**

---

## 📸 Visual Guide

### What You Should See:

```
Configure and deploy your new Web Service

┌─────────────────────────────────────────┐
│ Name                                    │
│ [itwos-ai-backend________________]      │
├─────────────────────────────────────────┤
│ Region                                  │
│ [Oregon (US West) ▼]                   │
├─────────────────────────────────────────┤
│ Branch                                  │
│ [main ▼]                                │
├─────────────────────────────────────────┤
│ Root Directory                          │
│ [backend________________]  ← SET THIS! │
├─────────────────────────────────────────┤
│ Build Command                           │
│ [npm install________________]           │
├─────────────────────────────────────────┤
│ Start Command                           │
│ [npm start________________]             │
└─────────────────────────────────────────┘

[Create Web Service] button
```

---

## 🔍 If You Don't See Root Directory Field

**Option 1: It's on the next screen**
- After selecting repository, click "Continue"
- Root Directory will be on the configuration form

**Option 2: It's in Advanced Settings**
- Look for "Advanced" or "More Options" button
- Click to expand
- Root Directory might be there

**Option 3: Set it after creation**
- Create the service first
- Go to **Settings** tab
- Find **"Build & Deploy"** section
- Edit **"Root Directory"** there
- Save and redeploy

---

## ✅ After Setting Root Directory

1. **Render will:**
   - Look in the `backend` folder
   - Find `backend/package.json`
   - Install dependencies from `backend/package.json`
   - Run `npm start` from `backend` folder

2. **Check deployment:**
   - Go to **"Events"** tab to see progress
   - Go to **"Logs"** tab to see output
   - Should see: "Installing dependencies..." then "Starting server..."

---

## 🆘 Troubleshooting

### Can't Find Root Directory Field?

1. **Make sure you've selected the repository first**
2. **Click "Continue" to go to configuration screen**
3. **Scroll down** - it might be below other fields
4. **Look for "Advanced" or "More Options"** button

### Field is Grayed Out?

1. **Select the repository first**
2. **Make sure you're on the configuration step**
3. **Try refreshing the page**

### After Creating, How to Change?

1. **Go to your service dashboard**
2. **Click "Settings" tab**
3. **Scroll to "Build & Deploy" section**
4. **Find "Root Directory"**
5. **Click "Edit"**
6. **Change to:** `backend`
7. **Click "Save Changes"**
8. **Service will redeploy automatically**

---

## 📝 Quick Reference

**What to type in Root Directory field:**
```
backend
```

**Not:**
- ❌ `Backend`
- ❌ `backend/`
- ❌ `/backend`
- ❌ `./backend`

**Just:** `backend` (lowercase, no slashes)

---

## ✅ Checklist

- [ ] Selected repository: `Itwoss / itwos.mrblack`
- [ ] Clicked "Continue" to configuration
- [ ] Found "Root Directory" field
- [ ] Typed: `backend` (lowercase, no slashes)
- [ ] Set Build Command: `npm install`
- [ ] Set Start Command: `npm start`
- [ ] Clicked "Create Web Service"

---

## 🎯 You're Ready!

Once Root Directory is set to `backend`, Render will correctly deploy your backend from the monorepo!

