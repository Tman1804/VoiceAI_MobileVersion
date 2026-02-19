# Capacitor Migration Plan

Falls Tauri's OAuth-Integration nicht funktioniert, ist **Capacitor** die beste Alternative. Hier ist der komplette Migrationsplan.

## Warum Capacitor?

| Feature | Tauri | Capacitor |
|---------|-------|-----------|
| Web-Tech Support | ✅ | ✅ |
| Next.js Integration | ✅ | ✅ (mit Export) |
| Google OAuth | ⚠️ Probleme | ✅ Native Plugin |
| Community | Kleiner | Größer |
| Plugins | Weniger | Sehr viele |

## Schritt 1: Capacitor Setup

```bash
# Capacitor installieren
npm install @capacitor/core @capacitor/cli
npx cap init VoxWarp com.voxwarp.app

# Android Platform hinzufügen
npm install @capacitor/android
npx cap add android
```

## Schritt 2: Next.js für Static Export konfigurieren

In `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
```

## Schritt 3: Capacitor Config

`capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.voxwarp.app',
  appName: 'VoxWarp',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
```

## Schritt 4: Google Sign-In Plugin installieren

```bash
npm install @codetrix-studio/capacitor-google-auth
npx cap sync
```

## Schritt 5: Code Migration

### Alte Tauri OAuth (entfernen)
```typescript
// @tauri-apps/plugin-opener - NICHT MEHR BENÖTIGT
```

### Neue Capacitor OAuth
```typescript
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export async function signInWithGoogle() {
  try {
    // Native Google Sign-In
    const result = await GoogleAuth.signIn();
    
    // Supabase mit ID Token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: result.authentication.idToken,
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Google sign-in failed:', error);
    throw new Error('Google-Login fehlgeschlagen');
  }
}
```

## Schritt 6: Android Konfiguration

In `android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">VoxWarp</string>
    <string name="server_client_id">YOUR_WEB_CLIENT_ID.apps.googleusercontent.com</string>
</resources>
```

## Schritt 7: Tauri-spezifischen Code entfernen/anpassen

### Zu ersetzende Imports:

| Tauri | Capacitor |
|-------|-----------|
| `@tauri-apps/plugin-clipboard-manager` | `@capacitor/clipboard` |
| `@tauri-apps/plugin-notification` | `@capacitor/push-notifications` |
| `@tauri-apps/plugin-dialog` | `@capacitor/dialog` |
| `@tauri-apps/plugin-fs` | `@capacitor/filesystem` |
| `@tauri-apps/plugin-shell` | `@capacitor/browser` |

### Beispiel Clipboard Migration:

**Tauri:**
```typescript
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
await writeText('text');
```

**Capacitor:**
```typescript
import { Clipboard } from '@capacitor/clipboard';
await Clipboard.write({ string: 'text' });
```

## Schritt 8: Build & Deploy

```bash
# Next.js exportieren
npm run build

# Capacitor sync
npx cap sync android

# Android Studio öffnen
npx cap open android
```

## Dateien die angepasst werden müssen

1. `src/lib/supabase.ts` - Google OAuth Funktion
2. `src/hooks/useTauriIntegration.ts` - Durch Capacitor-Version ersetzen
3. `src/hooks/useDeepLink.ts` - Nicht mehr benötigt
4. `package.json` - Tauri-deps durch Capacitor ersetzen
5. `next.config.js` - Static export aktivieren
6. Alle `@tauri-apps/*` Imports

## Geschätzte Migrationszeit

| Task | Zeit |
|------|------|
| Setup & Config | 30 min |
| Code Migration | 2-3 Stunden |
| Testing | 1-2 Stunden |
| **Gesamt** | **~4-5 Stunden** |

## Was bleibt gleich

✅ React Components (100% wiederverwendbar)
✅ Zustand Store (100% wiederverwendbar)
✅ Supabase Backend (100% wiederverwendbar)
✅ Tailwind Styles (100% wiederverwendbar)
✅ OpenAI Integration (100% wiederverwendbar)

---

**Hinweis:** Diese Migration ist nur nötig falls der aktuelle Tauri opener-Fix nicht funktioniert!
