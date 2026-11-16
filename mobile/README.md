# TripMate Android APK

This is the Android wrapper for the real, database-backed TripMate app. It opens
the same responsive app served by `server.js`; it does not use `demo.html` and
does not duplicate the database.

## Build in Android Studio

1. Install Android Studio with Android SDK 35 and JDK 17.
2. Open this `mobile` folder.
3. Ensure the phone and computer are on the same Wi-Fi network.
4. Start the backend from the project root:

   ```powershell
   npm run dev
   ```

5. Update the default LAN address in `app/build.gradle`, or build with:

   ```powershell
   .\gradlew assembleDebug -PtripmateBackendUrl=http://YOUR-COMPUTER-IP:3000/
   ```

6. Install `app/build/outputs/apk/debug/app-debug.apk` on the phone.

The backend already listens on `0.0.0.0`, which allows the phone to connect.
Windows Firewall must allow Node.js on the private network.

The default address is the LAN address documented in the root README:
`http://172.16.3.127:3000/`.
