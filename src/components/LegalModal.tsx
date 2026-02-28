'use client';

import React from 'react';
import { X } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms';
}

const PRIVACY_POLICY = `# Privacy Policy

**Last updated:** February 2026

## Overview

VoxWarp is a voice recording and transcription application. This privacy policy explains how we handle your data.

## Data We Collect

### Account Information
• Email address (for account creation and login)
• Google account info if using Google Sign-In
• Account credentials are managed securely via Supabase Auth

### Audio Recordings
• Audio is recorded only when you actively press the record button
• Recordings are sent to our secure server for AI processing
• Audio is processed immediately and not stored long-term
• Transcription results are stored in your account history

### Usage Data
• Token usage (tracking your AI processing consumption)
• Subscription status
• Recording history metadata

### Payment Information
• Payments are processed by Stripe
• We do not store credit card numbers or payment details

## Third-Party Services

### Supabase
We use Supabase for authentication, database, and backend services.

### OpenAI
Audio and text are processed using OpenAI's APIs (Whisper for transcription, GPT for enrichment).

### Stripe
Payment processing is handled by Stripe.

## Data Security

• All data transmission uses HTTPS encryption
• Passwords are hashed and never stored in plain text
• We implement industry-standard security practices

## Your Rights

You have full control over your data:
• Delete recordings from the history screen
• Delete your account and all associated data
• Request data export by contacting us`;

const TERMS_OF_SERVICE = `# Terms of Service

**VoxWarp**
*Last updated: February 2026*

## Acceptance of Terms

By downloading, installing, or using VoxWarp, you agree to these Terms of Service. If you do not agree, do not use the App.

## Description of Service

VoxWarp is a voice recording application that:
• Records audio using your device's microphone
• Transcribes audio using AI (OpenAI Whisper)
• Enriches transcriptions with AI processing
• Stores transcription history linked to your account

## Account Registration

To use VoxWarp, you must:
• Create an account using email/password or Google Sign-In
• Provide accurate account information
• Keep your login credentials secure
• Be at least 13 years old

## Subscription Plans

### Free Trial
• New users receive 5,000 tokens to try VoxWarp
• Trial tokens do not expire
• No payment information required

### Pro Plan (€3.99/month)
• 50,000 tokens per month
• All AI enrichment modes
• Tokens reset monthly on subscription renewal

## Acceptable Use

You agree NOT to use VoxWarp to:
• Record conversations without consent where required by law
• Process illegal, harmful, or prohibited content
• Violate any applicable laws or regulations
• Share accounts or circumvent usage limits

## Disclaimers

THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.

### No Guarantees
We do not guarantee:
• Accuracy of transcriptions or AI processing
• Continuous, uninterrupted, or secure access
• That results will be error-free

### AI Limitations
AI-generated content may contain errors. Always review and verify AI outputs before relying on them.

## Limitation of Liability

THE DEVELOPERS OF VOXWARP SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.

## Governing Law

These Terms shall be governed by the laws of Germany.

## Open Source

VoxWarp is open source software under the MIT License.`;

export function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  if (!isOpen) return null;

  const content = type === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE;
  const title = type === 'privacy' ? 'Privacy Policy' : 'Terms of Service';

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
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
