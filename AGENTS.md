# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Local Android Builds

- Android packaging defaults to the project-local toolchain. Run `npm.cmd run build:local:apk` from the repository root.
- If `.local-build` is missing or incomplete, run `npm.cmd run local:android:setup` first.
- JDK, Android SDK, Gradle/npm caches, temporary files, and signing credentials must stay under `.local-build`. Do not install build tools globally or change machine-level environment variables.
- The local Release build must use the EAS production keystore already stored in `.local-build`; never fall back to debug signing for a distributable APK.
- APK output belongs in `builds/`. Run `npm.cmd run check` before handing off a new APK.
- Do not use `eas build --local` on Windows. The supported local path is Expo prebuild plus Gradle through the repository scripts.
- Use EAS cloud builds only when the user explicitly requests cloud packaging or the local toolchain is genuinely blocked. After a cloud build, provide only its cloud install/download URL unless the user explicitly requests downloading the artifact.
