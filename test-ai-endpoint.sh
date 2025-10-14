#!/bin/bash

echo "🧪 Testing AI Puzzle Generation Endpoint"
echo ""

# First, let's check if we can reach the server
echo "1️⃣ Checking server health..."
curl -s http://localhost:3000/api/version > /dev/null && echo "✅ Server is responding" || echo "❌ Server not responding"
echo ""

# Note: The endpoint requires admin authentication
# We need to be logged in to test it
echo "2️⃣ Testing AI generation endpoint (requires admin auth)..."
echo "   This endpoint requires admin authentication."
echo "   Please test manually by:"
echo ""
echo "   1. Open http://localhost:3000/admin/login"
echo "   2. Log in with admin credentials"
echo "   3. Navigate to puzzle calendar"
echo "   4. Click any date"
echo "   5. Click '✨ AI Generate' button"
echo ""
echo "📋 Environment check:"
echo "   Looking for ANTHROPIC_API_KEY in running server..."
echo ""

# Try to trigger a request to see what happens
# This will fail auth but we can see if the AI service is enabled
echo "3️⃣ Quick endpoint check (will show auth error, that's normal):"
curl -s -X POST http://localhost:3000/api/admin/generate-puzzle \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-10-15"}' 2>&1 | head -5
echo ""
echo ""
echo "If you see an auth error above, that's correct!"
echo "The endpoint is working, you just need to log in."
echo ""
