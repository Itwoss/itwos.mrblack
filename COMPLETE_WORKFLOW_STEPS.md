# Complete Git Workflow: Development → Main → Remote

## 🎯 Your Complete Workflow

### **Phase 1: Work on Development Branch** ✅

```bash
# Step 1: Switch to development branch
git checkout development

# Step 2: Make your changes (code, edit files, etc.)
# ... your coding work here ...

# Step 3: Save your work frequently
git add .
git commit -m "Description of what you changed"

# Step 4: Continue working...
# Repeat steps 2-3 as needed
```

---

### **Phase 2: When Work is Finished - Move to Main** ✅

```bash
# Step 1: Make sure you're on development and everything is saved
git checkout development
git status  # Should show "nothing to commit" or "working tree clean"

# Step 2: If you have unsaved changes, save them:
git add .
git commit -m "Final changes before merging"

# Step 3: Switch to main branch
git checkout main

# Step 4: Get latest changes from remote (important if working with team)
git pull origin main

# Step 5: Merge development into main (bring your finished work)
git merge development

# Step 6: Verify merge was successful
git status
```

---

### **Phase 3: Push to Remote** ✅

```bash
# Step 1: Make sure you're on main branch
git checkout main
git branch  # Verify you see * main

# Step 2: Push main to remote
git push origin main

# Step 3: Also push development branch (optional but recommended)
git checkout development
git push origin development

# Step 4: Verify on GitHub
# Go to: https://github.com/Itwoss/itwos.mrblack.git
# Click "branches" to see your pushed branches
```

---

## 📋 Step-by-Step Commands (Copy & Paste)

### **Starting Work:**

```bash
git checkout development
git status
```

### **While Working:**

```bash
# After making changes:
git add .
git commit -m "What you changed"
```

### **When Finished:**

```bash
# Save final changes
git checkout development
git add .
git commit -m "Finished: description of work"

# Switch to main
git checkout main

# Get latest (if team project)
git pull origin main

# Merge development
git merge development

# Push to remote
git push origin main

# Go back to development for next work
git checkout development
```

---

## 🔍 Check Your Work

### **Check Local Branches:**
```bash
git branch
```

### **Check Remote Branches:**
```bash
git branch -r
```

### **Check What Changed:**
```bash
git status
git log --oneline -5  # See last 5 commits
```

---

## ⚠️ Common Issues & Solutions

### **Issue: "Please commit your changes"**
```bash
git add .
git commit -m "Saving work"
```

### **Issue: "Merge conflict"**
```bash
# Git will show conflicted files
# Edit files to resolve conflicts
git add .
git commit -m "Resolved merge conflicts"
```

### **Issue: "Remote branch not found"**
```bash
# First time pushing development:
git push -u origin development
```

---

## ✅ Quick Checklist

**Before switching branches:**
- [ ] Check current branch: `git branch`
- [ ] Save changes: `git add .` and `git commit`
- [ ] Verify: `git status` shows clean

**Before merging:**
- [ ] On development: `git checkout development`
- [ ] All changes saved: `git status`
- [ ] Switch to main: `git checkout main`
- [ ] Pull latest: `git pull origin main`
- [ ] Merge: `git merge development`

**Before pushing:**
- [ ] On main branch: `git checkout main`
- [ ] Merge successful: `git status`
- [ ] Push: `git push origin main`
- [ ] Verify: Check GitHub

---

## 🎓 Example Session

**Morning - Start Working:**
```bash
git checkout development
# Make changes...
git add .
git commit -m "Added new feature"
```

**Afternoon - Continue:**
```bash
# Still on development
# Make more changes...
git add .
git commit -m "Fixed bugs"
```

**Evening - Finish & Push:**
```bash
# Save final work
git add .
git commit -m "Completed feature"

# Move to main
git checkout main
git pull origin main
git merge development
git push origin main

# Back to development
git checkout development
```

---

## 🚀 Ready to Start?

1. **Switch to development:** `git checkout development`
2. **Start coding:** Make your changes
3. **Save frequently:** `git add .` then `git commit -m "message"`
4. **When done:** Follow Phase 2 & 3 above

