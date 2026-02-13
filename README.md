# Voice Note AI

A cross-platform application for capturing voice notes and transforming them with AI. Built with Next.js, Tauri 2.0, and OpenAI.

## Features

- 🎙️ **Voice Recording** - Record voice notes with a single tap
- 📝 **Speech-to-Text** - Automatic transcription using OpenAI Whisper
- 🤖 **AI Processing** - Transform transcripts with various AI modes
- 📋 **Clipboard Integration** - Copy results with one click
- 💾 **Export** - Save results as text files
- 🌐 **Multi-language** - Supports transcription in multiple languages

### Desktop Only
- ⌨️ **Global Hotkey** - `Ctrl+Shift+R` to start/stop recording
- 🖥️ **System Tray** - Minimize to tray for quick access

## Platforms

- ✅ **Android** - APK/AAB available via GitHub Actions
- ✅ **Windows** - Desktop app with system tray
- ✅ **macOS** - Desktop app
- ✅ **Linux** - Desktop app

## Prerequisites

- [Node.js](https://nodejs.org/) 18.x or later
- [Rust](https://rustup.rs/) (for Tauri)
- [OpenAI API Key](https://platform.openai.com/api-keys)

## Installation

### Android
Download the APK from GitHub Actions artifacts or build yourself:
```bash
npm install
npm run tauri android build -- --apk
```

### Desktop
```bash
npm install
npm run tauri:dev    # Development
npm run tauri:build  # Production
```

## Usage

1. Open the app and tap the Settings icon
2. Enter your OpenAI API key
3. Tap the microphone button to start recording
4. Speak your note, then tap again to stop
5. View transcription and AI-processed results
6. Copy or export as needed

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **State**: Zustand
- **Cross-platform**: Tauri 2.0 (Rust)
- **AI**: OpenAI API (Whisper, GPT-4o-mini)

## Privacy

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for details on data handling.

