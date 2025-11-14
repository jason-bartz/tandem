#!/bin/bash

echo "🔥 FORCING COMPLETE iOS UPDATE - NO CACHE SURVIVAL 🔥"
echo ""

# Close everything
echo "1️⃣ Closing Xcode and Simulator..."
killall Xcode 2>/dev/null || true
killall "Simulator" 2>/dev/null || true
killall "Tandem" 2>/dev/null || true
sleep 3

# Delete Xcode caches
echo "2️⃣ Nuking ALL Xcode caches..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf ~/Library/Developer/Xcode/UserData/ModuleCache.noindex
rm -rf ~/Library/Caches/com.apple.dt.Xcode
rm -rf ~/Library/Caches/org.carthage.CarthageKit

# Delete iOS app bundle (THIS IS KEY - forces rebuild)
echo "3️⃣ Deleting iOS app bundle..."
rm -rf ios/App/build
rm -rf ios/App/App/public
rm -rf ios/App/App/capacitor.config.json

# Delete Pods
echo "4️⃣ Cleaning CocoaPods..."
rm -rf ios/App/Pods
rm -rf ios/App/Podfile.lock
rm -rf ~/Library/Caches/CocoaPods

# Clean Next.js build
echo "5️⃣ Cleaning Next.js build..."
rm -rf .next
rm -rf out

echo ""
echo "6️⃣ Building fresh Next.js bundle..."
BUILD_TARGET=capacitor npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed! Fix errors and try again."
  exit 1
fi

echo ""
echo "7️⃣ Syncing to iOS..."
npx cap sync ios

if [ $? -ne 0 ]; then
  echo "❌ Capacitor sync failed!"
  exit 1
fi

echo ""
echo "8️⃣ Reinstalling Pods..."
cd ios/App
pod install --repo-update
cd ../..

echo ""
echo "✅ ALL DONE!"
echo ""
echo "📋 CRITICAL NEXT STEPS:"
echo "   1. DO NOT just press Run in Xcode"
echo "   2. Open Xcode: npx cap open ios"
echo "   3. Product → Clean Build Folder (Cmd+Shift+K)"
echo "   4. Product → Build (Cmd+B) - WAIT FOR IT TO COMPLETE"
echo "   5. Product → Run (Cmd+R)"
echo ""
echo "   Look for this in console logs:"
echo "   🔥🔥🔥 BUILD VERSION: $(date '+%Y-%m-%d-%H:%M') 🔥🔥🔥"
echo ""
