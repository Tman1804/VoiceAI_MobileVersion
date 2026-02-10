# Mobile Migration Plan - VoiceAI Mobile Version

## Overview
Convert the Tauri 1.x desktop app to Tauri 2.0 with iOS and Android support.

---

## Phase 1: Tauri 2.0 Migration (Foundation)

### 1.1 Update Dependencies
- [x] Upgrade `@tauri-apps/cli` from 1.5.8 → 2.x
- [x] Upgrade `@tauri-apps/api` from 1.5.3 → 2.x
- [x] Update Cargo.toml to use `tauri = "2.0"`

### 1.2 Configuration Changes
**tauri.conf.json → tauri.conf.json (v2 format)**
- [x] Migrate `allowlist` → new `permissions` system (capabilities-based)
- [x] Update bundle configuration for mobile targets
- [x] Add mobile-specific window configuration

### 1.3 API Breaking Changes
| Old API (v1) | New API (v2) | Files Affected |
|--------------|--------------|----------------|
| `@tauri-apps/api/globalShortcut` | Removed (desktop only) | `useTauriIntegration.ts` |
| `@tauri-apps/api/event` | `@tauri-apps/api/event` (same) | `useTauriIntegration.ts` |
| `SystemTray` | `TrayIcon` (desktop only) | `main.rs` |

---

## Phase 2: Remove/Replace Desktop Features

### 2.1 System Tray → Remove
**File:** `src-tauri/src/main.rs`
- [x] Remove `SystemTray` and `SystemTrayMenu` 
- [x] Remove tray event handlers
- [x] Keep window management, remove close-to-tray behavior

### 2.2 Global Hotkeys → Mobile Alternatives
**File:** `src/hooks/useTauriIntegration.ts`
- [x] Remove `globalShortcut` registration
- [ ] For iOS: Consider Siri Shortcuts integration (future enhancement)
- [ ] For Android: Consider notification action or widget (future enhancement)

### 2.3 Window Close Behavior
**File:** `src-tauri/src/main.rs`
- [x] Remove `CloseRequested` interception (mobile apps don't minimize to tray)
- [x] Standard mobile app lifecycle (suspend/resume)

---

## Phase 3: Mobile UI Adaptations

### 3.1 Layout Changes
**Files:** `src/app/page.tsx`, `src/components/*.tsx`
- [x] Make recording button larger (touch-friendly, min 48x48dp)
- [x] Increase tap targets on all interactive elements
- [x] Remove footer hotkey hint (mobile has no keyboard shortcuts)
- [ ] Add swipe gestures for navigation (settings ↔ recording)

### 3.2 Responsive Design
- [x] Update Tailwind breakpoints for mobile-first
- [ ] Test on small screens (320px width minimum)
- [x] Add safe area insets for notch/home indicator

### 3.3 Mobile-Specific UX
- [x] Add haptic feedback on recording start/stop
- [ ] Show recording indicator in status bar (iOS) / notification (Android)
- [ ] Handle app backgrounding during recording
- [x] Add "keep screen awake" during recording

---

## Phase 4: Platform Setup

### 4.1 iOS Setup
```bash
# Prerequisites
xcode-select --install
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim

# Initialize iOS project
npm run tauri ios init
```
- [ ] Configure signing (Apple Developer account required)
- [ ] Add microphone permission to Info.plist (`NSMicrophoneUsageDescription`)
- [ ] Add App Transport Security exception for localhost (dev only)

### 4.2 Android Setup
```bash
# Prerequisites: Android Studio + NDK
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

# Initialize Android project  
npm run tauri android init
```
- [ ] Configure signing (keystore)
- [ ] Add microphone permission to AndroidManifest.xml (`RECORD_AUDIO`)
- [ ] Set `minSdkVersion` to 24 (Android 7.0+)

---

## Phase 5: Mobile-Specific Features

### 5.1 Audio Recording on Mobile
**File:** `src/lib/audioRecorder.ts`
- [ ] Test MediaRecorder API compatibility on mobile WebViews
- [ ] Handle audio focus (pause other audio apps)
- [ ] Handle interruptions (phone calls)

### 5.2 Background Recording (Optional/Advanced)
- iOS: Background audio mode in capabilities
- Android: Foreground service with notification

### 5.3 Share Integration
- [x] Add "Share" button to ResultsDisplay
- [x] Use native share sheet instead of clipboard-only

---

## Phase 6: Build & Distribution

### 6.1 Development Commands
```bash
npm run tauri ios dev      # iOS simulator
npm run tauri android dev  # Android emulator
npm run tauri ios build    # iOS release
npm run tauri android build # Android release (APK/AAB)
```

### 6.2 Distribution
- **iOS:** TestFlight → App Store (requires Apple Developer $99/yr)
- **Android:** Internal testing → Google Play (requires $25 one-time)

---

## Recommended Migration Order

1. **Phase 1** - Tauri 2.0 upgrade (desktop still works)
2. **Phase 2** - Remove desktop-only features (conditionally)
3. **Phase 4** - Platform setup (iOS/Android init)
4. **Phase 3** - UI adaptations
5. **Phase 5** - Mobile-specific features
6. **Phase 6** - Build and test

---

## Risk & Considerations

| Risk | Mitigation |
|------|------------|
| MediaRecorder not supported on old Android WebView | Set minSdk 24+, test on real devices |
| iOS requires paid developer account | Use simulator for dev, account for distribution |
| Recording while backgrounded is complex | Start with foreground-only, add background later |
| OpenAI API calls fail on mobile networks | Already have retry logic; add offline queue (future) |

---

## Files to Modify Summary

| File | Changes | Status |
|------|---------|--------|
| `package.json` | Update Tauri deps to v2 | ✅ Done |
| `src-tauri/Cargo.toml` | Update tauri to v2 | ✅ Done |
| `src-tauri/tauri.conf.json` | v2 format, mobile config | ✅ Done |
| `src-tauri/capabilities/default.json` | New permissions system | ✅ Created |
| `src-tauri/src/main.rs` | Remove tray, update to v2 API | ✅ Done |
| `src-tauri/src/lib.rs` | Mobile entry point | ✅ Created |
| `src/hooks/useTauriIntegration.ts` | Remove globalShortcut, platform detection | ✅ Done |
| `src/app/page.tsx` | Remove hotkey footer (conditional) | ✅ Done |
| `src/app/globals.css` | Touch targets, safe area insets | ✅ Done |
| `src/components/VoiceRecorder.tsx` | Mobile-friendly button sizing | ✅ Done |
| `src/components/ResultsDisplay.tsx` | Add share button | ✅ Done |
