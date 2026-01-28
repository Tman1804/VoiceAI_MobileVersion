'use client';

import { useState } from 'react';
import { Eye, EyeOff, Save, ArrowLeft } from 'lucide-react';
import { useAppStore, EnrichmentMode, OutputLanguage } from '@/store/appStore';
import { getEnrichmentModeLabel, getEnrichmentModeDescription, getLanguageLabel } from '@/lib/enrichmentService';

const ENRICHMENT_MODES: EnrichmentMode[] = ['clean-transcript', 'summarize', 'action-items', 'meeting-notes', 'custom'];
const OUTPUT_LANGUAGES: OutputLanguage[] = ['auto', 'de', 'en', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'zh', 'ko'];

export function SettingsPanel() {
  const { settings, updateSettings, setShowSettings } = useAppStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => { updateSettings(localSettings); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <h2 className="text-xl font-semibold text-white">Settings</h2>
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">OpenAI API Key</label>
          <div className="relative">
            <input type={showApiKey ? 'text' : 'password'} value={localSettings.openAiApiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, openAiApiKey: e.target.value })} placeholder="sk-..."
              className="w-full px-4 py-2 pr-12 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-slate-500">Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">OpenAI Platform</a></p>
        </div>

        {/* Language Settings */}
        <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300">Language Settings</h3>
          
          <div className="space-y-2">
            <label className="block text-sm text-slate-400">Output Language</label>
            <select 
              value={localSettings.outputLanguage}
              onChange={(e) => setLocalSettings({ ...localSettings, outputLanguage: e.target.value as OutputLanguage })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {OUTPUT_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{getLanguageLabel(lang)}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Language for transcription and AI processing output</p>
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-white">Translate to English</p>
              <p className="text-sm text-slate-400">Translate audio to English during transcription</p>
            </div>
            <div className={`relative w-12 h-6 rounded-full transition-colors ${localSettings.translateToEnglish ? 'bg-primary-600' : 'bg-slate-700'}`}
              onClick={() => setLocalSettings({ ...localSettings, translateToEnglish: !localSettings.translateToEnglish })}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.translateToEnglish ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">AI Processing Mode</label>
          <div className="grid gap-2">
            {ENRICHMENT_MODES.map((mode) => (
              <label key={mode} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${localSettings.enrichmentMode === mode ? 'bg-primary-600/20 border border-primary-500' : 'bg-slate-900 border border-slate-700 hover:border-slate-600'}`}>
                <input type="radio" name="enrichmentMode" value={mode} checked={localSettings.enrichmentMode === mode}
                  onChange={(e) => setLocalSettings({ ...localSettings, enrichmentMode: e.target.value as EnrichmentMode })} className="mt-1" />
                <div><p className="font-medium text-white">{getEnrichmentModeLabel(mode)}</p><p className="text-sm text-slate-400">{getEnrichmentModeDescription(mode)}</p></div>
              </label>
            ))}
          </div>
        </div>
        {localSettings.enrichmentMode === 'custom' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Custom Prompt</label>
            <textarea value={localSettings.customPrompt} onChange={(e) => setLocalSettings({ ...localSettings, customPrompt: e.target.value })}
              placeholder="Enter your custom instructions..." rows={4}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
        )}
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div><p className="font-medium text-white">Auto-enrich after transcription</p><p className="text-sm text-slate-400">Automatically process with AI after recording</p></div>
            <div className={`relative w-12 h-6 rounded-full transition-colors ${localSettings.autoEnrich ? 'bg-primary-600' : 'bg-slate-700'}`}
              onClick={() => setLocalSettings({ ...localSettings, autoEnrich: !localSettings.autoEnrich })}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.autoEnrich ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div><p className="font-medium text-white">Auto-copy to clipboard</p><p className="text-sm text-slate-400">Copy enriched content automatically</p></div>
            <div className={`relative w-12 h-6 rounded-full transition-colors ${localSettings.autoCopyToClipboard ? 'bg-primary-600' : 'bg-slate-700'}`}
              onClick={() => setLocalSettings({ ...localSettings, autoCopyToClipboard: !localSettings.autoCopyToClipboard })}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.autoCopyToClipboard ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>
        <button onClick={handleSave} className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>
          <Save className="w-5 h-5" />{saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
