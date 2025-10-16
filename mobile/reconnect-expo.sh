#!/bin/bash

# Reconnect Expo to emulator after WiFi switch
# Run this script instead of restarting Cursor

ADB="$HOME/Library/Android/sdk/platform-tools/adb"

echo "🔧 Reconnecting Expo to Android emulator..."

# Check if emulator is connected
if ! $ADB devices | grep -q "emulator"; then
    echo "❌ No emulator detected. Make sure the Android emulator is running."
    exit 1
fi

# Reverse the Metro bundler port
$ADB reverse tcp:8081 tcp:8081
echo "✅ ADB port reversed (8081)"

# Reverse the Expo dev server port
$ADB reverse tcp:8097 tcp:8097
echo "✅ ADB port reversed (8097)"

# Reverse the Expo dev tools port
$ADB reverse tcp:19000 tcp:19000
echo "✅ ADB port reversed (19000)"

echo "✅ Done! Ports reconnected."
echo ""
echo "Now reload the app:"
echo "  • In emulator: Cmd+M → tap 'Reload'"
echo "  • Or press 'r' in the Expo terminal"
