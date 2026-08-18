# Setup

## Requirements
- Node.js 20+, npm 10+
- PostgreSQL 16 and Redis 7 for persistence/queues (Phase 2)
- Android Studio with JDK 17, SDK 35 for Android

## Web/API development
1. `cp .env.example .env`; generate strong auth/encryption secrets.
2. `npm install`
3. `npm run dev`
4. Run `npm test`, `npm run typecheck`, and `npm run build` before merging.

Demo mode is explicit and safe. It exercises realtime UI/runtime state without claiming live research. The current Arena adapter refuses to start without a base URL and does not invent a transport path.

## Android
This sandbox has Java 11 but no Android SDK, Kotlin compiler, or Gradle, so Android compilation cannot be verified here. Open `android/` in a current Android Studio, use JDK 17, create `local.properties`, replace the build-time API URL through a non-committed configuration, and run `./gradlew test connectedAndroidTest`.
