#!/bin/bash

# Quick script to start ngrok with your configured authtoken

echo "🌐 Starting ngrok tunnel..."
echo ""

# Check if ngrok is configured
if npx ngrok config check &>/dev/null; then
    echo "✅ ngrok is configured!"
    echo "📡 Starting tunnel on port 7000..."
    echo ""
    echo "📊 View requests at: http://localhost:4040"
    echo ""
    npx ngrok http 7000
else
    echo "❌ ngrok not configured!"
    echo ""
    echo "Configuring with your authtoken..."
    export NGROK_AUTHTOKEN=365icDtsfpLu7dmV1COq9uxuTOI_3uAhCcVzkNXSdJmmBWiTD
    npx ngrok config add-authtoken $NGROK_AUTHTOKEN
    echo ""
    echo "✅ Configured! Starting tunnel..."
    echo ""
    npx ngrok http 7000
fi

