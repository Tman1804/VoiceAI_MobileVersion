'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Mic } from 'lucide-react';
import { signIn, signUp, signInWithGoogle, supabase } from '@/lib/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthScreenProps {
  onSuccess: () => void;
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Check for existing session (fallback for OAuth)
  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session check:', session?.user?.email || 'no session');
      if (session) {
        setGoogleLoading(false);
        onSuccess();
      }
    } catch (e) {
      console.error('Session check failed:', e);
    }
  }, [onSuccess]);

  // Listen for auth state changes (e.g., from OAuth callback via deep link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        // User successfully signed in - trigger success callback
        setGoogleLoading(false);
        onSuccess();
      }
      
      if (event === 'TOKEN_REFRESHED') {
        setGoogleLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onSuccess]);

  // Fallback: Check session when app comes back into focus (after OAuth in external browser)
  useEffect(() => {
    // Check on visibility change (user returning from browser)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && googleLoading) {
        console.log('App became visible, checking session...');
        checkSession();
      }
    };

    // Check on window focus (alternative trigger)
    const handleFocus = () => {
      if (googleLoading) {
        console.log('Window focused, checking session...');
        checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [googleLoading, checkSession]);

  // Also poll periodically while googleLoading is true (last resort fallback)
  useEffect(() => {
    if (!googleLoading) return;

    const pollInterval = setInterval(() => {
      console.log('Polling for session...');
      checkSession();
    }, 2000); // Check every 2 seconds

    // Stop polling after 60 seconds
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setGoogleLoading(false);
      setError('Google-Login Timeout. Bitte versuche es erneut.');
    }, 60000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [googleLoading, checkSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        onSuccess();
      } else {
        await signUp(email, password);
        setSuccess('Bestätigungs-Email gesendet! Bitte prüfe dein Postfach.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Redirect happens automatically via Supabase OAuth
    } catch (err: any) {
      setError(translateError(err.message));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 safe-area-inset">
      <div className="w-full max-w-md animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl mb-5 shadow-glow">
            <Mic className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">VoxWarp</h1>
          <p className="text-slate-400 mt-2">Sprache zu Text mit KI</p>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-3xl p-6 shadow-elevated">
          {/* Tab Switcher */}
          <div className="flex gap-1 p-1 glass-card-darker rounded-xl mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all duration-300 ${
                isLogin 
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Anmelden
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all duration-300 ${
                !isLogin 
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Registrieren
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-4 glass-card-darker rounded-xl border border-red-500/30 flex items-start gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-5 p-4 glass-card-darker rounded-xl border border-green-500/30 animate-fadeIn">
              <p className="text-sm text-green-200">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">E-Mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors group-focus-within:text-primary-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  required
                  className="w-full pl-12 pr-4 py-3.5 glass-card-darker border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Passwort</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors group-focus-within:text-primary-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-12 pr-12 py-3.5 glass-card-darker border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLogin ? 'Anmelden' : 'Konto erstellen'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 glass-card text-slate-500 rounded-full">oder</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-3.5 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Mit Google {isLogin ? 'anmelden' : 'registrieren'}
          </button>

          {/* Trial info */}
          {!isLogin && (
            <div className="mt-5 text-center p-3 glass-card-darker rounded-xl">
              <p className="text-sm text-slate-400">
                🎁 Nach der Registrierung erhältst du{' '}
                <span className="text-gradient font-semibold">2.500 Tokens</span>{' '}
                kostenlos!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Mit der Anmeldung akzeptierst du unsere{' '}
          <span className="text-slate-400 hover:text-white cursor-pointer transition-colors">Nutzungsbedingungen</span>{' '}
          und{' '}
          <span className="text-slate-400 hover:text-white cursor-pointer transition-colors">Datenschutzerklärung</span>.
        </p>
      </div>
    </div>
  );
}

function translateError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'E-Mail oder Passwort falsch.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
  }
  if (message.includes('User already registered')) {
    return 'Diese E-Mail ist bereits registriert. Bitte melde dich an.';
  }
  if (message.includes('Password should be')) {
    return 'Passwort muss mindestens 6 Zeichen haben.';
  }
  if (message.includes('rate limit')) {
    return 'Zu viele Versuche. Bitte warte kurz.';
  }
  return message;
}
