#!/usr/bin/env bash
set -e

echo "=== 1. Setting up Standalone OpenJDK 17 ==="
mkdir -p /opt/jdk
if [ ! -f /opt/jdk/bin/java ]; then
  echo "Downloading Eclipse Temurin OpenJDK 17..."
  curl -fsSL "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7.tar.gz" -o /tmp/jdk17.tar.gz
  tar -xzf /tmp/jdk17.tar.gz -C /opt/jdk --strip-components=1
  rm -f /tmp/jdk17.tar.gz
fi

export JAVA_HOME="/opt/jdk"
export PATH="$JAVA_HOME/bin:$PATH"

java -version

echo "=== 2. Setting up Android SDK ==="
export ANDROID_HOME="/opt/android-sdk"
export ANDROID_SDK_ROOT="/opt/android-sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"

if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
  echo "Downloading Android Command-line Tools..."
  curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -o /tmp/cmdline-tools.zip
  mkdir -p /tmp/cmdline-extract
  unzip -q -o /tmp/cmdline-tools.zip -d /tmp/cmdline-extract
  mv /tmp/cmdline-extract/cmdline-tools "$ANDROID_HOME/cmdline-tools/latest"
  rm -rf /tmp/cmdline-tools.zip /tmp/cmdline-extract
fi

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "Accepting Android Licenses & Installing SDK Packages..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools" > /dev/null 2>&1 || true

echo "=== 3. Setting up Gradle 8.2 ==="
mkdir -p /opt/gradle
if [ ! -f /opt/gradle/bin/gradle ]; then
  echo "Downloading Gradle 8.2..."
  curl -fsSL "https://services.gradle.org/distributions/gradle-8.2-bin.zip" -o /tmp/gradle.zip
  unzip -q -o /tmp/gradle.zip -d /tmp/gradle-extract
  mv /tmp/gradle-extract/gradle-8.2/* /opt/gradle/
  rm -rf /tmp/gradle.zip /tmp/gradle-extract
fi

export PATH="/opt/gradle/bin:$PATH"

gradle -v

echo "=== 4. Configuring Project ==="
cd /app/applet/android
echo "sdk.dir=$ANDROID_HOME" > local.properties

echo "=== 5. Building Native Android APK ==="
gradle assembleRelease --no-daemon --stacktrace || gradle assembleDebug --no-daemon --stacktrace

echo "=== 6. Locating and Deploying Built APK ==="
APK_FILE=$(find /app/applet/android/app/build/outputs/apk -name "*.apk" | head -n 1)

if [ -n "$APK_FILE" ] && [ -f "$APK_FILE" ]; then
  cp "$APK_FILE" /app/applet/VYBE-release.apk
  echo "SUCCESS! VYBE Android APK created at /app/applet/VYBE-release.apk"
  ls -lh /app/applet/VYBE-release.apk
else
  echo "ERROR: No APK generated!"
  exit 1
fi
