#!/bin/bash

# Quick script to start backend and ngrok for testing

echo "🚀 Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 5

echo "🌐 Starting ngrok tunnel..."
ngrok http 7000 &
NGROK_PID=$!

echo ""
echo "✅ Backend and ngrok are running!"
echo ""
echo "📋 Next steps:"
echo "1. Check ngrok URL: http://localhost:4040"
echo "2. Copy the ngrok URL (e.g., https://abc123.ngrok.io)"
echo "3. Update Vercel environment variables:"
echo "   - VITE_API_URL = https://your-ngrok-url.ngrok.io/api"
echo "   - VITE_SOCKET_URL = https://your-ngrok-url.ngrok.io"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait

