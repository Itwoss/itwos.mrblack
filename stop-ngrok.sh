#!/bin/bash

# Stop all ngrok processes

echo "🛑 Stopping ngrok processes..."

# Kill ngrok processes
pkill -f ngrok

sleep 1

# Check if any are still running
if pgrep -f ngrok > /dev/null; then
    echo "⚠️  Some processes still running, force killing..."
    pkill -9 -f ngrok
    sleep 1
fi

# Verify
if pgrep -f ngrok > /dev/null; then
    echo "❌ Could not stop all ngrok processes"
    echo "Try manually: pkill -9 -f ngrok"
else
    echo "✅ All ngrok processes stopped"
fi

