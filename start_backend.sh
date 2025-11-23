#!/bin/bash

# Start Backend Server
cd /Users/itwosin/.cursor/worktrees/main_itwos_ai_/C7Ux2/backend

echo "🚀 Starting backend server..."
echo "📁 Directory: $(pwd)"
echo ""

# Check if already running
if lsof -ti:7000 > /dev/null 2>&1; then
    echo "⚠️  Port 7000 is already in use!"
    echo "   Stopping existing process..."
    lsof -ti:7000 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Start server
echo "🔄 Starting server..."
node server.js

