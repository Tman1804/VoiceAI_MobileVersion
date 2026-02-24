import { create } from 'zustand';
import { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import { supabase, getUserUsage, UserUsage } from '@/lib/supabase';

// Track if listener is already registered (prevent duplicates)
let authListenerRegistered = false;
let realtimeChannel: RealtimeChannel | null = null;

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
  subscribeToUsageChanges: (userId: string) => void;
  unsubscribeFromUsageChanges: () => void;
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

  // Subscribe to realtime changes on user_usage table
  subscribeToUsageChanges: (userId: string) => {
    // Unsubscribe from any existing channel first
    get().unsubscribeFromUsageChanges();
    
    console.log('Subscribing to realtime usage changes for user:', userId);
    
    realtimeChannel = supabase
      .channel(`user_usage_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_usage',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Realtime usage update received:', payload);
          if (payload.new && typeof payload.new === 'object') {
            const newUsage = payload.new as UserUsage;
            set({ usage: newUsage });
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
  },

  unsubscribeFromUsageChanges: () => {
    if (realtimeChannel) {
      console.log('Unsubscribing from realtime usage changes');
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  },

  initialize: async () => {
    // Don't re-initialize if already done
    if (get().initialized) {
      return;
    }

    try {
      // Register auth listener ONCE
      if (!authListenerRegistered) {
        authListenerRegistered = true;
        
        supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth event:', event);
          
          // Always update session immediately
          set({ session });
          
          if (session?.user) {
            set({ user: session.user });
            
            // Load usage in background - never blocks UI after init
            getUserUsage(session.user.id).then(usage => {
              set({ usage });
            }).catch(console.error);
            
            // Subscribe to realtime updates
            get().subscribeToUsageChanges(session.user.id);
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, usage: null });
            get().unsubscribeFromUsageChanges();
          }
        });
      }

      // Get initial session - this is the ONLY place we show loading
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ session, user: session.user });
        
        // Load usage - wait for this on initial load only
        const usage = await getUserUsage(session.user.id);
        set({ usage });
        
        // Subscribe to realtime updates
        get().subscribeToUsageChanges(session.user.id);
      }
      
      // Done - never show loading again after this point
      set({ loading: false, initialized: true });
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Always finish loading even on error
      set({ loading: false, initialized: true });
    }
  },

  refreshUsage: async () => {
    const user = get().user;
    if (!user) return;
    
    try {
      const usage = await getUserUsage(user.id);
      set({ usage });
    } catch (error) {
      console.error('Failed to refresh usage:', error);
    }
  },

  logout: async () => {
    try {
      get().unsubscribeFromUsageChanges();
      await supabase.auth.signOut();
      set({ user: null, session: null, usage: null });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
}));
