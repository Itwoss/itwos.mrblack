#!/bin/bash

echo "🚀 Forcing clean Vercel deployment..."

# Make a small change to force new commit
echo "# Force deployment $(date)" >> frontend/README.md

# Commit the change
git add .
git commit -m "Force Vercel deployment with latest fixes"

# Push to GitHub
git push origin main

echo "✅ Changes pushed to GitHub"
echo "🔄 Now go to Vercel and redeploy your project"
echo "📝 Make sure Vercel is using the latest commit: $(git log --oneline -1)"
