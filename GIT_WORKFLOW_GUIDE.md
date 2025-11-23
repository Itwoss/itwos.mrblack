# Git Branch Workflow Guide - Step by Step

## 🎯 Your 2-Branch Setup

**Branch 1: `development`** - For your working code (where you make changes)
**Branch 2: `main`** - For finished/stable code (ready to share)

---

## 📋 Step-by-Step: How to Switch Branches Manually

### **Method 1: Using Git Commands (Recommended)**

#### **Step 1: Check Current Branch**
```bash
git branch
```
- Look for the branch with `*` - that's your current branch
- Example: `* main` means you're on `main` branch

#### **Step 2: Save Your Work (If You Have Changes)**
```bash
# Check if you have unsaved changes
git status

# If you see "modified" files, save them:
git add .
git commit -m "Your work description"
```

#### **Step 3: Switch to Another Branch**
```bash
# Switch to development branch
git checkout development

# OR switch to main branch
git checkout main
```

#### **Step 4: Verify You Switched**
```bash
git branch
```
- The `*` should now be on the branch you switched to

---

### **Method 2: Using VS Code / Cursor (Visual)**

1. **Open Source Control** (Ctrl+Shift+G or Cmd+Shift+G)
2. **Click on branch name** at bottom-left corner
3. **Select branch** from the list
4. **Click on branch name** to switch

---

## 🔄 Complete Workflow: Working → Finished → Push

### **Scenario: You want to work on new features**

#### **Phase 1: Start Working (on `development` branch)**

```bash
# Step 1: Switch to development branch
git checkout development

# Step 2: Make your changes (code, edit files, etc.)

# Step 3: Save your work
git add .
git commit -m "Added new feature: post creation"

# Step 4: Continue working...
# Make more changes, save again:
git add .
git commit -m "Fixed image matching issue"
```

#### **Phase 2: When Work is Finished (move to `main` branch)**

```bash
# Step 1: Make sure all changes are saved on development
git checkout development
git status  # Should show "nothing to commit"

# Step 2: Switch to main branch
git checkout main

# Step 3: Get latest changes from remote (if working with team)
git pull origin main

# Step 4: Merge development into main
git merge development

# Step 5: Push finished work to remote
git push origin main
```

#### **Phase 3: Update Development Branch**

```bash
# Step 1: Switch back to development
git checkout development

# Step 2: Get latest from main (so development stays updated)
git merge main

# Step 3: Now development has all the latest finished work
```

---

## 📤 Push to Remote Branch (Step by Step)

### **First Time Pushing a Branch:**

```bash
# Step 1: Make sure you're on the branch you want to push
git checkout development

# Step 2: Push to remote (creates remote branch)
git push -u origin development
```

### **After First Time:**

```bash
# Just push (no -u needed)
git push origin development
```

---

## 🔍 Check Remote Branch After Push

### **Step 1: View Remote Branches**
```bash
git branch -r
```
- Shows all remote branches
- Example: `origin/main`, `origin/development`

### **Step 2: Check Remote Status**
```bash
git fetch origin
git status
```
- Shows if your local branch is ahead/behind remote

### **Step 3: View on GitHub**
1. Go to: https://github.com/Itwoss/itwos.mrblack.git
2. Click "branches" dropdown
3. See your pushed branches

---

## 🛠️ Common Commands Cheat Sheet

| What You Want | Command |
|--------------|---------|
| See all branches | `git branch` |
| Switch branch | `git checkout branch-name` |
| Create new branch | `git checkout -b new-branch` |
| Save changes | `git add .` then `git commit -m "message"` |
| Push to remote | `git push origin branch-name` |
| Get latest from remote | `git pull origin branch-name` |
| See what changed | `git status` |
| See commit history | `git log` |

---

## ⚠️ Important Rules

1. **Always save before switching branches**
   - Use `git add .` and `git commit -m "message"`

2. **Check your current branch**
   - Use `git branch` to see where you are

3. **Pull before push** (if working with team)
   - `git pull origin main` before `git push`

4. **Work on development, finish on main**
   - Development = your playground
   - Main = stable, finished code

---

## 🎓 Example Day Workflow

**Morning:**
```bash
git checkout development    # Switch to working branch
# Make changes, code, test
git add .
git commit -m "Morning work"
```

**Afternoon:**
```bash
# Continue on development
git add .
git commit -m "Afternoon fixes"
```

**Evening (when done):**
```bash
git checkout main           # Switch to main
git merge development       # Bring finished work
git push origin main        # Share with remote
git checkout development    # Back to working branch
```

---

## 🆘 Troubleshooting

**Problem: "You have uncommitted changes"**
```bash
# Save them first:
git add .
git commit -m "Saving work"
# Then switch branch
```

**Problem: "Branch already exists"**
```bash
# Just switch to it:
git checkout branch-name
```

**Problem: "Remote branch not found"**
```bash
# Push it first time:
git push -u origin branch-name
```

---

## ✅ Quick Checklist

Before switching branches:
- [ ] Check current branch: `git branch`
- [ ] Save changes: `git add .` and `git commit`
- [ ] Switch: `git checkout branch-name`
- [ ] Verify: `git branch` (check the `*`)

Before pushing:
- [ ] On correct branch: `git branch`
- [ ] All changes saved: `git status`
- [ ] Push: `git push origin branch-name`
- [ ] Check remote: `git branch -r`

