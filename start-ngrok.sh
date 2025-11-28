#!/bin/bash

# Start ngrok tunnel
# Make sure you've configured ngrok first with: ./setup-ngrok.sh

echo "🌐 Starting ngrok tunnel..."
echo ""

# Check if ngrok is configured
if [ ! -f ~/.ngrok2/ngrok.yml ] && [ ! -f ~/.config/ngrok/ngrok.yml ]; then
    echo "❌ ngrok is not configured!"
    echo ""
    echo "Please run setup first:"
    echo "  ./setup-ngrok.sh"
    echo ""
    echo "Or manually configure:"
    echo "  npx ngrok config add-authtoken YOUR_AUTHTOKEN"
    exit 1
fi

echo "✅ Starting ngrok on port 7000..."
echo "📊 View requests at: http://localhost:4040"
echo ""

npx ngrok http 7000
