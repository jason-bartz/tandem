#!/bin/bash

echo "🔧 AI Generation Setup Fix"
echo "=========================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "   Creating it now..."
    touch .env.local
fi

# Check API key
if grep -q "ANTHROPIC_API_KEY=sk-ant-" .env.local 2>/dev/null; then
    echo "✅ API key found in .env.local"
else
    echo "⚠️  API key not found in .env.local"
    echo "   Please add these lines to .env.local:"
    echo ""
    echo "ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE"
    echo "AI_MODEL=claude-3-5-sonnet-20241022"
    echo "AI_GENERATION_ENABLED=true"
    echo ""
    read -p "Press Enter after adding the API key..."
fi

echo ""
echo "🛑 Stopping any running dev servers..."
pkill -f "next dev" 2>/dev/null && echo "   Stopped" || echo "   No server was running"
sleep 2

echo ""
echo "🧹 Clearing Next.js cache..."
rm -rf .next 2>/dev/null && echo "   .next/ deleted" || echo "   No cache to clear"
rm -rf node_modules/.cache 2>/dev/null && echo "   node_modules/.cache deleted" || echo "   No cache to clear"

echo ""
echo "📦 Ensuring dependencies are installed..."
npm install --silent

echo ""
echo "✅ Verification..."
node test-ai-simple.mjs 2>&1 | grep -E "✅|❌|🎉"

echo ""
echo "🚀 Starting dev server..."
echo "   Server will start in a new process"
echo "   Watch for: 'Environments: .env.local' in the output"
echo ""

npm run dev &

sleep 8

echo ""
echo "🎯 Next Steps:"
echo "   1. Wait for server to fully start (look for 'Ready in X.Xs')"
echo "   2. Open http://localhost:3000/admin/login"
echo "   3. Log in with admin credentials"
echo "   4. Click any date in calendar"
echo "   5. Look for purple '✨ AI Generate' button"
echo "   6. Click and wait 2-5 seconds"
echo ""
echo "📋 If still not working, check TROUBLESHOOTING_AI.md"
echo ""
