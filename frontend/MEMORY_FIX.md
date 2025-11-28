# 🔧 Frontend Memory Fix Guide

## Problem
Frontend dev server crashes with:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

## ✅ Solution Applied

### 1. Increased Node.js Heap Size
Updated `package.json` scripts:
- `dev`: Now uses `--max-old-space-size=12288` (12GB)
- `dev:high`: Now uses `--max-old-space-size=16384` (16GB)
- `build`: Now uses `--max-old-space-size=12288` (12GB)

### 2. Optimized Vite Config
- Added file watching exclusions
- Reduced memory usage during development

---

## 🚀 How to Use

### Start Dev Server (Recommended):
```bash
cd frontend
npm run dev
```

### If Still Having Issues:
```bash
# Use high memory mode
npm run dev:high
```

### For Memory Monitoring:
```bash
# Includes garbage collection exposure
npm run dev:memory
```

---

## 🔍 Additional Optimizations

### If Memory Issues Persist:

1. **Close Other Applications**
   - Close browser tabs
   - Close other Node.js processes
   - Free up system RAM

2. **Clear Node Cache:**
   ```bash
   cd frontend
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **Reduce Concurrent Processes:**
   - Stop backend server if not needed
   - Close other development tools

4. **Check System Memory:**
   ```bash
   # macOS
   vm_stat
   
   # Linux
   free -h
   ```

---

## 📊 Memory Usage Tips

### During Development:
- ✅ Use `npm run dev` (12GB heap)
- ✅ Close unused browser tabs
- ✅ Restart dev server if memory grows
- ❌ Don't run multiple dev servers simultaneously

### During Build:
- ✅ Use `npm run build` (12GB heap)
- ✅ Close other applications
- ✅ Build on a machine with 16GB+ RAM

---

## 🐛 Troubleshooting

### Still Crashing?

1. **Check Available RAM:**
   - macOS: Activity Monitor
   - Linux: `free -h`
   - Windows: Task Manager

2. **Reduce Heap Size if System RAM < 16GB:**
   ```json
   "dev": "NODE_OPTIONS='--max-old-space-size=8192' vite"
   ```

3. **Check for Memory Leaks:**
   - Look for infinite loops in `useEffect`
   - Check for uncleaned intervals/timeouts
   - Verify WebSocket connections are closed

4. **Restart Everything:**
   ```bash
   # Kill all Node processes
   pkill -f node
   
   # Clear cache
   cd frontend
   rm -rf node_modules/.vite
   rm -rf dist
   
   # Restart
   npm run dev
   ```

---

## 📝 Notes

- Default Node.js heap limit: ~2GB
- Current dev heap limit: 12GB
- Recommended system RAM: 16GB+
- If system has < 16GB RAM, reduce heap size accordingly

---

## ✅ Status

- [x] Increased heap size to 12GB
- [x] Optimized Vite config
- [x] Added memory monitoring option
- [x] Created troubleshooting guide

---

## 🆘 Still Having Issues?

1. Check system RAM availability
2. Reduce heap size if needed
3. Clear Vite cache
4. Restart dev server
5. Check for memory leaks in code

