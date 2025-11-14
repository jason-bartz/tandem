#!/bin/bash

echo "🧹 Cleaning iOS build artifacts..."

# Close Xcode if running
echo "Closing Xcode..."
killall Xcode 2>/dev/null || true
killall "Simulator" 2>/dev/null || true
sleep 2

# Clean Xcode DerivedData (THIS IS KEY!)
echo "Removing Xcode DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Clean Xcode module cache
echo "Removing Xcode module cache..."
rm -rf ~/Library/Developer/Xcode/UserData/ModuleCache.noindex

# Clean iOS app directory
echo "Removing iOS app public folder..."
rm -rf ios/App/App/public

# Clean iOS capacitor config
echo "Removing iOS capacitor config..."
rm -rf ios/App/App/capacitor.config.json

# Clean iOS build folder
echo "Removing iOS build folder..."
rm -rf ios/App/build

# Clean Pods
echo "Cleaning CocoaPods..."
rm -rf ios/App/Pods
rm -rf ios/App/Podfile.lock

# Clean Next.js build
echo "Cleaning Next.js build..."
rm -rf .next
rm -rf out

# Clean node modules cache (optional but recommended)
echo "Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

echo ""
echo "🔨 Building iOS app..."
npm run build:ios

echo ""
echo "📱 Syncing with Capacitor..."
npx cap sync ios

echo ""
echo "🔄 Reinstalling iOS Pods..."
cd ios/App && pod install --repo-update && cd ../..

echo ""
echo "✅ Build complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open Xcode: npx cap open ios"
echo "2. In Xcode: Product → Clean Build Folder (Cmd+Shift+K)"
echo "3. Run the app"
echo ""
echo "If issues persist, also run:"
echo "  rm -rf ~/Library/Developer/Xcode/DerivedData/*"
