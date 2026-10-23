#!/usr/bin/env bash
set -e

echo "=== VYBE Android APK Build Pipeline ==="

# Check Java
java -version

# Setup Android SDK Directory
export ANDROID_HOME="/opt/android-sdk"
export ANDROID_SDK_ROOT="/opt/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

mkdir -p "$ANDROID_HOME/cmdline-tools"

if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
    echo "Downloading Android Command-line Tools..."
    cd /tmp
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip || \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip -O cmdline-tools.zip
    
    mkdir -p /tmp/cmdline-tools
    unzip -q -o /tmp/cmdline-tools.zip -d /tmp/cmdline-tools
    mv /tmp/cmdline-tools/cmdline-tools "$ANDROID_HOME/cmdline-tools/latest"
    rm -f /tmp/cmdline-tools.zip
fi

echo "Accepting Android Licenses & Installing SDK packages..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools" > /dev/null 2>&1 || true

# Download Gradle binary if needed
if ! command -v gradle &> /dev/null; then
    echo "Installing Gradle 8.2..."
    cd /tmp
    wget -q https://services.gradle.org/distributions/gradle-8.2-bin.zip -O gradle.zip
    unzip -q -o gradle.zip -d /opt
    export PATH="/opt/gradle-8.2/bin:$PATH"
    rm -f gradle.zip
fi

echo "Generating local.properties..."
echo "sdk.dir=$ANDROID_HOME" > /app/applet/android/local.properties

echo "Building VYBE Native Android APK..."
cd /app/applet/android

gradle assembleRelease --no-daemon || gradle assembleDebug --no-daemon

echo "Finding generated APK..."
APK_PATH=$(find app/build/outputs/apk -name "*.apk" | head -n 1)

if [ -f "$APK_PATH" ]; then
    echo "APK built successfully at: $APK_PATH"
    cp "$APK_PATH" /app/applet/VYBE-release.apk
    ls -lh /app/applet/VYBE-release.apk
    echo "=== BUILD COMPLETE ==="
else
    echo "ERROR: APK file not found!"
    exit 1
fi
