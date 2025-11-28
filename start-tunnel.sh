#!/bin/bash

# Start a tunnel to expose localhost:7000
# Uses localtunnel (no sign up required!)

echo "🌐 Starting tunnel for backend..."
echo ""

# Check if localtunnel is installed
if command -v lt &> /dev/null; then
    echo "✅ Using localtunnel"
    echo "📡 Starting tunnel on port 7000..."
    echo ""
    lt --port 7000
elif [ -f "./node_modules/.bin/lt" ]; then
    echo "✅ Using local localtunnel"
    ./node_modules/.bin/lt --port 7000
else
    echo "❌ localtunnel not found!"
    echo ""
    echo "Installing localtunnel..."
    npm install -g localtunnel
    echo ""
    echo "✅ Installed! Starting tunnel..."
    lt --port 7000
fi

