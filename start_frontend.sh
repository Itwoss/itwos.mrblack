#!/bin/bash

# Start Frontend Server - MacBook Air 8GB Optimized
cd "/Users/itwosin/.cursor/worktrees/main_itwos_ai_/C7Ux2/frontend"

echo "🚀 Starting frontend server..."
echo "📁 Directory: $(pwd)"
echo "💾 Memory limit: 2GB (optimized for 8GB MacBook Air)"
echo ""

# Check if already running
if lsof -ti:5173 > /dev/null 2>&1; then
    echo "⚠️  Port 5173 is already in use!"
    echo "   Stopping existing process..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Start server with optimized memory settings
echo "🔄 Starting Vite dev server..."
echo "   Available commands:"
echo "   - npm run dev        (2GB - Recommended)"
echo "   - npm run dev:memory (3GB - Medium)"
echo "   - npm run dev:high   (4GB - High)"
echo ""
npm run dev

