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
      console.log('Auth already initialized, skipping');
      return;
    }

    try {
      // Register auth listener ONCE
      if (!authListenerRegistered) {
        authListenerRegistered = true;
        console.log('Registering auth state change listener');
        
        supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change:', event, session?.user?.email);
          
          // Skip TOKEN_REFRESHED if we already have user data - no need to reload
          if (event === 'TOKEN_REFRESHED' && get().user && get().usage) {
            set({ session });
            return;
          }
          
          if (session?.user) {
            // Only set loading if we don't have user data yet (fresh login)
            const needsLoading = !get().user;
            if (needsLoading) {
              set({ session, user: session.user, loading: true });
            } else {
              set({ session, user: session.user });
            }
            
            // Load usage with userId
            const usage = await getUserUsage(session.user.id);
            set({ usage, loading: false, initialized: true });
            
            // Subscribe to realtime updates
            get().subscribeToUsageChanges(session.user.id);
          } else {
            set({ session: null, user: null, usage: null, loading: false });
            get().unsubscribeFromUsageChanges();
          }
        });
      }

      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Initial session check:', session?.user?.email || 'no session');
      
      if (session?.user) {
        // Check if onAuthStateChange already handled this
        if (!get().user) {
          set({ session, user: session.user });
          
          // Load usage with userId
          const usage = await getUserUsage(session.user.id);
          set({ usage, loading: false, initialized: true });
          
          // Subscribe to realtime updates
          get().subscribeToUsageChanges(session.user.id);
        }
      } else {
        // No session - done loading
        set({ loading: false, initialized: true });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
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
    console.log('Logout called');
    try {
      get().unsubscribeFromUsageChanges();
      console.log('Unsubscribed from realtime');
      await supabase.auth.signOut();
      console.log('Signed out from Supabase');
      set({ user: null, session: null, usage: null });
      console.log('State cleared');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
}));
