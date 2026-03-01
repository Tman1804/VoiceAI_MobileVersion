'use client';

import { useState } from 'react';
import { Save, ArrowLeft, ChevronRight, FileText, Shield } from 'lucide-react';
import { useAppStore, OutputLanguage } from '@/store/appStore';
import { getLanguageLabel } from '@/lib/enrichmentService';
import { LegalModal } from './LegalModal';

const OUTPUT_LANGUAGES: OutputLanguage[] = ['auto', 'de', 'en', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'zh', 'ko'];

export function SettingsPanel() {
  const { settings, updateSettings, setShowSettings } = useAppStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  const handleSave = () => { 
    updateSettings(localSettings); 
    setSaved(true); 
    setTimeout(() => setSaved(false), 2000); 
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <h2 className="text-xl font-semibold text-white">Settings</h2>
      </div>

      <div className="space-y-5">
        {/* Output Language */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">Output Language</label>
          <select 
            value={localSettings.outputLanguage}
            onChange={(e) => setLocalSettings({ ...localSettings, outputLanguage: e.target.value as OutputLanguage })}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {OUTPUT_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{getLanguageLabel(lang)}</option>
            ))}
          </select>
        </div>

        {/* Toggles */}
        <div className="space-y-3 py-2">
          <label className="flex items-center justify-between cursor-pointer py-2">
            <span className="text-white">Auto-process</span>
            <div 
              className={`relative w-11 h-6 rounded-full transition-colors ${localSettings.autoEnrich ? 'bg-primary-600' : 'bg-slate-700'}`}
              onClick={() => setLocalSettings({ ...localSettings, autoEnrich: !localSettings.autoEnrich })}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.autoEnrich ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
          
          <label className="flex items-center justify-between cursor-pointer py-2">
            <span className="text-white">Auto-copy to clipboard</span>
            <div 
              className={`relative w-11 h-6 rounded-full transition-colors ${localSettings.autoCopyToClipboard ? 'bg-primary-600' : 'bg-slate-700'}`}
              onClick={() => setLocalSettings({ ...localSettings, autoCopyToClipboard: !localSettings.autoCopyToClipboard })}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.autoCopyToClipboard ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSave} 
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
        >
          <Save className="w-5 h-5" />
          {saved ? 'Saved!' : 'Save'}
        </button>

        {/* Divider */}
        <div className="border-t border-slate-700 pt-4 mt-4">
          <p className="text-sm text-slate-400 mb-3">Legal</p>
          <div className="space-y-2">
            <button 
              onClick={() => setLegalModal('privacy')}
              className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-900/50 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4" />
                <span>Privacy Policy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
            <button 
              onClick={() => setLegalModal('terms')}
              className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-900/50 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                <span>Terms of Service</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-slate-600 pt-2">VoxWarp v1.0.0</p>
      </div>

      <LegalModal 
        isOpen={legalModal !== null} 
        onClose={() => setLegalModal(null)} 
        type={legalModal || 'privacy'} 
      />
    </div>
  );
}
