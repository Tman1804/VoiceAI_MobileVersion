import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEnrichmentModeLabel, getEnrichmentModeDescription, getLanguageLabel } from '../lib/enrichmentService';
import type { EnrichmentMode, OutputLanguage } from '../store/appStore';

// Note: enrichTranscript function requires OpenAI API key and makes real API calls
// We test the helper functions that don't require API calls

describe('enrichmentService', () => {
  describe('getEnrichmentModeLabel', () => {
    it('returns correct label for summarize mode', () => {
      expect(getEnrichmentModeLabel('summarize')).toBe('Summarize');
    });

    it('returns correct label for action-items mode', () => {
      expect(getEnrichmentModeLabel('action-items')).toBe('Extract Action Items');
    });

    it('returns correct label for meeting-notes mode', () => {
      expect(getEnrichmentModeLabel('meeting-notes')).toBe('Meeting Notes');
    });

    it('returns correct label for clean-transcript mode', () => {
      expect(getEnrichmentModeLabel('clean-transcript')).toBe('Clean Transcript');
    });

    it('returns correct label for custom mode', () => {
      expect(getEnrichmentModeLabel('custom')).toBe('Custom Prompt');
    });

    it('returns correct label for blog-post mode', () => {
      expect(getEnrichmentModeLabel('blog-post')).toBe('Blog Post');
    });

    it('returns correct label for email-draft mode', () => {
      expect(getEnrichmentModeLabel('email-draft')).toBe('Email');
    });

    it('returns correct label for interview mode', () => {
      expect(getEnrichmentModeLabel('interview')).toBe('Interview');
    });
  });

  describe('getEnrichmentModeDescription', () => {
    it('returns correct description for all modes', () => {
      const modes: EnrichmentMode[] = ['summarize', 'action-items', 'meeting-notes', 'clean-transcript', 'custom', 'blog-post', 'email-draft', 'interview'];
      
      modes.forEach(mode => {
        const description = getEnrichmentModeDescription(mode);
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getLanguageLabel', () => {
    it('returns correct label for auto language', () => {
      expect(getLanguageLabel('auto')).toBe('Auto (Same as input)');
    });

    it('returns correct label for German', () => {
      expect(getLanguageLabel('de')).toBe('Deutsch');
    });

    it('returns correct label for English', () => {
      expect(getLanguageLabel('en')).toBe('English');
    });

    it('returns correct labels for all supported languages', () => {
      const languages: OutputLanguage[] = ['auto', 'de', 'en', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'zh', 'ko'];
      
      languages.forEach(lang => {
        const label = getLanguageLabel(lang);
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });
});
