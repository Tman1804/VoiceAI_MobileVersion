'use client';

import React from 'react';
import { X } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms';
}

const PRIVACY_POLICY = `# Datenschutz

**Letzte Aktualisierung:** Februar 2026

## Überblick

VoxWarp ist eine Sprachaufnahme- und Transkriptions-App. Diese Datenschutzerklärung erklärt, wie wir mit Ihren Daten umgehen.

## Datenerfassung

### Audioaufnahmen
• Audio wird nur aufgezeichnet, wenn Sie aktiv die Aufnahmetaste drücken
• Aufnahmen werden temporär im Gerätespeicher verarbeitet
• Audio wird direkt an OpenAI-Server zur Transkription gesendet
• **Wir speichern Ihre Audioaufnahmen auf keinem Server**

### OpenAI API-Schlüssel
• Sie stellen Ihren eigenen OpenAI API-Schlüssel bereit
• Der API-Schlüssel wird nur lokal auf Ihrem Gerät gespeichert
• Wir übertragen Ihren API-Schlüssel an keinen anderen Server als OpenAI

### Transkribierter Text
• Transkriptionsergebnisse werden in der App angezeigt
• Text kann auf Ihren Wunsch in die Zwischenablage kopiert werden
• **Wir speichern oder sammeln Ihre Transkriptionen nicht**

## Drittanbieter-Dienste

### OpenAI
Diese App nutzt OpenAIs Whisper API für Transkription und GPT für Textverarbeitung. Ihre Daten werden gemäß OpenAIs Datenschutzrichtlinie verarbeitet.

## Datenspeicherung

• Alle App-Einstellungen werden lokal auf Ihrem Gerät gespeichert
• Keine persönlichen Daten werden an unsere Server übertragen (wir haben keine)
• Keine Analysen oder Tracking implementiert

## Berechtigungen

### Mikrofon
Erforderlich zur Audioaufnahme für die Transkription. Die App greift nur auf das Mikrofon zu, wenn Sie eine Aufnahme starten.

### Internet
Erforderlich für die Kommunikation mit OpenAIs API.

## Datensicherheit

• Ihr API-Schlüssel wird im privaten Speicher der App gespeichert
• Alle Kommunikation mit OpenAI verwendet HTTPS-Verschlüsselung
• Keine Daten werden mit Dritten außer OpenAI geteilt

## Ihre Rechte

Sie haben volle Kontrolle über Ihre Daten:
• Löschen Sie die App, um alle lokal gespeicherten Daten zu entfernen
• Widerrufen Sie Ihren OpenAI API-Schlüssel jederzeit über das OpenAI-Dashboard
• Löschen Sie App-Daten über Ihre Geräteeinstellungen`;

const TERMS_OF_SERVICE = `# Nutzungsbedingungen

**VoxWarp**
*Letzte Aktualisierung: Februar 2026*

## Annahme der Bedingungen

Durch das Herunterladen, Installieren oder Nutzen von VoxWarp stimmen Sie diesen Nutzungsbedingungen zu. Wenn Sie nicht zustimmen, nutzen Sie die App nicht.

## Beschreibung des Dienstes

VoxWarp ist eine Sprachaufnahme-Anwendung, die:
• Audio über das Mikrofon Ihres Geräts aufzeichnet
• Audio an OpenAIs API zur Transkription und KI-Verarbeitung sendet
• Ergebnisse anzeigt und Kopieren/Teilen ermöglicht

## Voraussetzungen

Zur Nutzung von VoxWarp benötigen Sie:
• Ein kompatibles Gerät (Android, Windows, macOS oder Linux)
• Ihren eigenen OpenAI API-Schlüssel
• Eine aktive Internetverbindung für KI-Funktionen

## OpenAI API-Nutzung

### Ihr API-Schlüssel
• Sie müssen Ihren eigenen gültigen OpenAI API-Schlüssel bereitstellen
• Sie sind für alle Nutzungen und Kosten Ihres API-Schlüssels verantwortlich
• Halten Sie Ihren API-Schlüssel vertraulich und sicher
• Teilen Sie keine API-Schlüssel oder nutzen Sie fremde Schlüssel ohne Berechtigung

## Akzeptable Nutzung

Sie stimmen zu, VoxWarp NICHT zu nutzen für:
• Aufnahme von Gesprächen ohne Einwilligung, wo gesetzlich erforderlich
• Verarbeitung illegaler, schädlicher oder verbotener Inhalte
• Verletzung geltender Gesetze oder Vorschriften
• Verletzung der Rechte anderer

## Haftungsausschluss

### "WIE BESEHEN"-Basis
DIE APP WIRD "WIE BESEHEN" OHNE GARANTIEN JEGLICHER ART BEREITGESTELLT, AUSDRÜCKLICH ODER STILLSCHWEIGEND.

### Keine Garantien
Wir garantieren nicht:
• Genauigkeit von Transkriptionen oder KI-Verarbeitung
• Kontinuierlichen, unterbrechungsfreien oder sicheren Zugang
• Dass die App Ihre spezifischen Anforderungen erfüllt
• Dass Ergebnisse fehlerfrei sind

### KI-Einschränkungen
KI-generierte Inhalte können Fehler oder unangemessene Inhalte enthalten. Überprüfen Sie KI-Ausgaben immer, bevor Sie sich darauf verlassen.

## Haftungsbeschränkung

IM MAXIMAL GESETZLICH ZULÄSSIGEN UMFANG HAFTEN DIE ENTWICKLER VON VOXWARP NICHT FÜR INDIREKTE, ZUFÄLLIGE, BESONDERE, FOLGE- ODER STRAFSCHÄDEN.

## Geltendes Recht

Diese Bedingungen unterliegen dem Recht der Bundesrepublik Deutschland.

## Open Source

VoxWarp ist Open-Source-Software unter der MIT-Lizenz.`;

export function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  if (!isOpen) return null;

  const content = type === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE;
  const title = type === 'privacy' ? 'Datenschutz' : 'Nutzungsbedingungen';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="prose prose-invert prose-sm max-w-none">
            {content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) {
                return <h1 key={i} className="text-xl font-bold text-white mt-0 mb-4">{line.slice(2)}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={i} className="text-lg font-semibold text-white mt-6 mb-2">{line.slice(3)}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={i} className="text-base font-medium text-slate-200 mt-4 mb-2">{line.slice(4)}</h3>;
              }
              if (line.startsWith('• ')) {
                return <p key={i} className="text-slate-300 ml-4 my-1">• {line.slice(2)}</p>;
              }
              if (line.startsWith('**') && line.includes('**')) {
                const parts = line.split('**');
                return (
                  <p key={i} className="text-slate-400 text-sm my-1">
                    <strong className="text-slate-300">{parts[1]}</strong>{parts[2]}
                  </p>
                );
              }
              if (line.startsWith('*') && line.endsWith('*')) {
                return <p key={i} className="text-slate-500 text-sm italic">{line.slice(1, -1)}</p>;
              }
              if (line.trim() === '') {
                return <div key={i} className="h-2" />;
              }
              if (line === line.toUpperCase() && line.length > 20) {
                return <p key={i} className="text-slate-400 text-xs my-2">{line}</p>;
              }
              return <p key={i} className="text-slate-300 my-1">{line}</p>;
            })}
          </div>
        </div>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
