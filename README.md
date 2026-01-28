# Voice Note AI

A desktop application for capturing voice notes and transforming them with AI. Built with Next.js, Tauri, and OpenAI.

## Features

- ?? **Voice Recording** - Record voice notes with a single click or global hotkey
- ?? **Speech-to-Text** - Automatic transcription using OpenAI Whisper
- ?? **AI Processing** - Transform transcripts with various AI modes
- ?? **Clipboard Integration** - Copy results with one click
- ?? **Export** - Save results as text files
- ?? **Global Hotkey** - `Ctrl+Shift+R` to start/stop recording
- ??? **System Tray** - Minimize to tray for quick access

## Prerequisites

- [Node.js](https://nodejs.org/) 18.x or later
- [Rust](https://rustup.rs/) (for Tauri)
- [OpenAI API Key](https://platform.openai.com/api-keys)

## Installation

```bash
cd voice-note-ai
npm install
npm run dev          # Web only
npm run tauri:dev    # Desktop app
```

## Usage

1. Click the Settings icon and enter your OpenAI API key
2. Click the microphone button or press `Ctrl+Shift+R` to record
3. Speak your note, then stop recording
4. View transcription and AI-processed results
5. Copy or export as needed

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **State**: Zustand
- **Desktop**: Tauri (Rust)
- **AI**: OpenAI API (Whisper, GPT-4o-mini)
