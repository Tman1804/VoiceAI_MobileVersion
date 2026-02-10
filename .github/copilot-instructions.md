# Voice Note AI - Copilot Instructions

## Architecture Overview

This is a **Tauri + Next.js** desktop app for voice recording with AI transcription and enrichment.

**Data Flow:** User speech → [AudioRecorder](../src/lib/audioRecorder.ts) → [transcriptionService](../src/lib/transcriptionService.ts) (OpenAI Whisper) → [enrichmentService](../src/lib/enrichmentService.ts) (GPT-4o-mini) → Display/Clipboard

**Key Components:**
- `src/app/page.tsx` - Main UI orchestration, manages view state between settings and recording
- `src/components/VoiceRecorder.tsx` - Recording logic with timer, processes audio through transcription → enrichment pipeline
- `src/store/appStore.ts` - Zustand store with persistence for settings; holds all app state
- `src-tauri/src/main.rs` - Rust backend for system tray, window management, and emitting events

## Development Commands

```bash
npm run dev          # Next.js web-only (no Tauri features)
npm run tauri:dev    # Full desktop app with hot reload
npm run tauri:build  # Production build (outputs to src-tauri/target/release)
```

## Project Conventions

### State Management
- All state in single Zustand store at [src/store/appStore.ts](../src/store/appStore.ts)
- Settings are persisted via `zustand/middleware/persist` to localStorage
- Use store setters directly: `setIsRecording(true)`, `updateSettings({ ... })`

### OpenAI Integration
- API key stored in Zustand settings, accessed via `settings.openAiApiKey`
- Uses `dangerouslyAllowBrowser: true` in OpenAI client (desktop app, not public web)
- Retry logic with exponential backoff for rate limits in transcriptionService

### Tauri ↔ React Communication
- Global hotkey (`Ctrl+Shift+R`) via `@tauri-apps/api/globalShortcut`
- Recording toggle uses custom DOM event: `window.dispatchEvent(new CustomEvent('toggle-recording'))`
- Tauri emits `start-recording` event from system tray; listened in [useTauriIntegration.ts](../src/hooks/useTauriIntegration.ts)

### UI Patterns
- All icons from `lucide-react`
- Tailwind with custom primary color (configured in tailwind.config.js)
- Dark theme using `slate-*` color palette
- Components are `'use client'` for React hooks compatibility with Next.js App Router

## Enrichment Modes

Located in [enrichmentService.ts](../src/lib/enrichmentService.ts) - adding a new mode requires:
1. Add to `EnrichmentMode` type in `appStore.ts`
2. Add prompt to `ENRICHMENT_PROMPTS` record
3. Add label/description in `getEnrichmentModeLabel`/`getEnrichmentModeDescription`

## Known Constraints

- Recording max size: 25MB (Whisper API limit)
- Window close minimizes to system tray (close intercepted in main.rs)
- Audio format auto-detected: prefers `audio/webm;codecs=opus`
