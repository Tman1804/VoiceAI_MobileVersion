import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getUserUsage, UserUsage } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  usage: UserUsage | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setUsage: (usage: UserUsage | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  usage: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setUsage: (usage) => set({ usage }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    try {
      // Listen for auth changes FIRST (so we don't miss OAuth callback)
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        set({ session, user: session?.user || null });
        
        if (session?.user) {
          // Load usage with userId to avoid race condition
          const usage = await getUserUsage(session.user.id);
          set({ usage, loading: false });
        } else {
          set({ usage: null });
        }
      });

      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ session, user: session.user });
        
        // Load usage with userId
        const usage = await getUserUsage(session.user.id);
        set({ usage });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  refreshUsage: async () => {
    const user = get().user;
    if (!user) return;
    
    try {
      const usage = await getUserUsage();
      set({ usage });
    } catch (error) {
      console.error('Failed to refresh usage:', error);
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, usage: null });
  },
}));
