#!/bin/bash

# ngrok Setup Script
# This script helps you set up ngrok authentication

echo "🔐 ngrok Authentication Setup"
echo "=============================="
echo ""

# Check if authtoken is already configured
if [ -f ~/.ngrok2/ngrok.yml ] || [ -f ~/.config/ngrok/ngrok.yml ]; then
    echo "✅ ngrok is already configured!"
    echo ""
    echo "To start ngrok, run:"
    echo "  npx ngrok http 7000"
    echo ""
    read -p "Do you want to add a new authtoken? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

echo "📝 Step 1: Sign up for ngrok (if you haven't)"
echo "   Go to: https://dashboard.ngrok.com/signup"
echo ""
echo "📝 Step 2: Get your authtoken"
echo "   Go to: https://dashboard.ngrok.com/get-started/your-authtoken"
echo ""
read -p "Press Enter when you have your authtoken..."
echo ""

read -p "Enter your ngrok authtoken: " authtoken

if [ -z "$authtoken" ]; then
    echo "❌ Authtoken cannot be empty!"
    exit 1
fi

echo ""
echo "🔧 Configuring ngrok..."
npx ngrok config add-authtoken "$authtoken"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ngrok configured successfully!"
    echo ""
    echo "🚀 To start ngrok, run:"
    echo "   npx ngrok http 7000"
    echo ""
    echo "📊 View requests at: http://localhost:4040"
else
    echo ""
    echo "❌ Configuration failed. Please check your authtoken."
    echo ""
    echo "Manual setup:"
    echo "  npx ngrok config add-authtoken YOUR_AUTHTOKEN"
fi

