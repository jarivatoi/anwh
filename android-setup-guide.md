# Android APK Setup Guide for Work Schedule App

## Prerequisites
1. **Node.js** (v16 or higher)
2. **Android Studio** (latest version)
3. **Java Development Kit (JDK)** 11 or higher
4. **Android SDK** (API level 21 or higher)

## Step-by-Step Setup

### 1. Install Capacitor Dependencies
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/app
```

### 2. Initialize Capacitor (if not already done)
```bash
npx cap init "Work Schedule" "com.narayya.workschedule"
```

### 3. Build Your Web App
```bash
npm run build
```

### 4. Add Android Platform
```bash
npx cap add android
```

### 5. Copy Web Assets
```bash
npx cap copy android
```

### 6. Sync Capacitor
```bash
npx cap sync android
```

## Android Studio Configuration

### 7. Open Project in Android Studio
```bash
npx cap open android
```

### 8. Configure App Details

#### Update `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.narayya.workschedule">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Work Schedule"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:exported="true"
            android:launchMode="singleTask"
            android:name="com.narayya.workschedule.MainActivity"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths"></meta-data>
        </provider>
    </application>

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
</manifest>
```

#### Update `android/app/build.gradle`:
```gradle
android {
    namespace "com.narayya.workschedule"
    compileSdkVersion rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.narayya.workschedule"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
             // Files and dirs to omit from the packaged assets dir, modified to accommodate modern web apps.
             // Default: https://android.googlesource.com/platform/frameworks/base/+/282e181b58cf72b6ca770dc7ca5f91f135444502/tools/aapt/AaptAssets.cpp#61
            ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 9. Create App Icons

Create app icons in the following sizes and place them in `android/app/src/main/res/`:

- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

### 10. Build APK

#### For Debug APK:
1. In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Or via command line:
```bash
cd android
./gradlew assembleDebug
```

#### For Release APK:

1. **Generate signing key**:
```bash
keytool -genkey -v -keystore work-schedule-release-key.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias work-schedule-key
```

2. **Configure signing** in `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

3. **Create gradle.properties** in android folder:
```properties
MYAPP_RELEASE_STORE_FILE=work-schedule-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=work-schedule-key
MYAPP_RELEASE_STORE_PASSWORD=your_store_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

4. **Build release APK**:
```bash
./gradlew assembleRelease
```

## Development Workflow

### Making Changes
1. Make changes to your web app
2. Build: `npm run build`
3. Copy assets: `npx cap copy android`
4. Sync: `npx cap sync android`
5. Test in Android Studio

### Testing
- **Emulator**: Use Android Studio's AVD Manager
- **Physical Device**: Enable Developer Options and USB Debugging

### Debugging
- Use Chrome DevTools: `chrome://inspect/#devices`
- Android Studio Logcat for native logs

## Output Locations
- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`

## Troubleshooting

### Common Issues:
1. **Build fails**: Check Android SDK and build tools versions
2. **App crashes**: Check Logcat for errors
3. **White screen**: Ensure `npm run build` was successful and assets copied
4. **Permissions**: Add required permissions to AndroidManifest.xml

### Performance Optimization:
1. Enable hardware acceleration in AndroidManifest.xml
2. Use `android:hardwareAccelerated="true"`
3. Optimize images and assets
4. Test on various devices and screen sizes

## Next Steps
1. Test thoroughly on different devices
2. Optimize for various screen sizes
3. Add app store assets (screenshots, descriptions)
4. Prepare for Google Play Store submission