# Android Manifest Permissions Required
Add to android/app/src/main/AndroidManifest.xml:

<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<service android:name="com.capacitorjs.plugins.pushnotifications.ForegroundService"
         android:foregroundServiceType="phoneCall" />

# config.xml additions (android/app/src/main/res/xml/config.xml):
<plugin name="FCM" />
<allow-intent href="*" />
<platform name="android">
  <allow-navigation href="*" />
</platform>

# Build commands:
npx cap sync android
npx cap run android
# Or for release APK:
cd android && ./gradlew assembleRelease
