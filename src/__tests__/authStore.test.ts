import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock functions - use vi.hoisted() so they're available when vi.mock is hoisted
const {
  mockGetSession,
  mockOnAuthStateChange,
  mockSignOut,
  mockGetUserUsage,
  mockChannel,
  mockRemoveChannel,
  mockChannelObj,
} = vi.hoisted(() => {
  const mockChannelObj = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    mockGetSession: vi.fn(),
    mockOnAuthStateChange: vi.fn(),
    mockSignOut: vi.fn(),
    mockGetUserUsage: vi.fn(),
    mockChannel: vi.fn(),
    mockRemoveChannel: vi.fn(),
    mockChannelObj,
  };
});

// Mock @/lib/supabase - this is what authStore actually imports
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: any) => {
        mockOnAuthStateChange(callback);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signOut: () => mockSignOut(),
    },
    channel: (name: string) => {
      mockChannel(name);
      return mockChannelObj;
    },
    removeChannel: mockRemoveChannel,
  },
  getUserUsage: (userId?: string) => mockGetUserUsage(userId),
}));

// Import after mocking
import { useAuthStore } from '../store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store
    useAuthStore.setState({
      user: null,
      session: null,
      usage: null,
      loading: true,
      initialized: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.usage).toBeNull();
      expect(state.loading).toBe(true);
      expect(state.initialized).toBe(false);
    });
  });

  describe('Setters', () => {
    it('setUser updates user', () => {
      const mockUser = { id: '123', email: 'test@test.com' };
      
      useAuthStore.getState().setUser(mockUser as any);
      
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('setSession updates session', () => {
      const mockSession = { access_token: 'token123' };
      
      useAuthStore.getState().setSession(mockSession as any);
      
      expect(useAuthStore.getState().session).toEqual(mockSession);
    });

    it('setUsage updates usage', () => {
      const mockUsage = { tokens_used: 100, tokens_limit: 2500, plan: 'trial' as const };
      
      useAuthStore.getState().setUsage(mockUsage);
      
      expect(useAuthStore.getState().usage).toEqual(mockUsage);
    });

    it('setLoading updates loading state', () => {
      useAuthStore.getState().setLoading(false);
      
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  describe('initialize', () => {
    it('sets initialized and loading after completion', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      
      await useAuthStore.getState().initialize();
      
      expect(useAuthStore.getState().initialized).toBe(true);
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('loads user and session when session exists', async () => {
      const mockSession = {
        access_token: 'token123',
        user: { id: '123', email: 'test@test.com' },
      };
      const mockUsage = { tokens_used: 500, tokens_limit: 2500, plan: 'trial' };
      
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockGetUserUsage.mockResolvedValue(mockUsage);
      
      await useAuthStore.getState().initialize();
      
      expect(useAuthStore.getState().user).toEqual(mockSession.user);
      expect(useAuthStore.getState().session).toEqual(mockSession);
      expect(useAuthStore.getState().usage).toEqual(mockUsage);
    });

    it('handles no session gracefully', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      
      await useAuthStore.getState().initialize();
      
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().initialized).toBe(true);
    });
  });

  describe('refreshUsage', () => {
    it('does nothing when no user is logged in', async () => {
      useAuthStore.setState({ user: null });
      
      await useAuthStore.getState().refreshUsage();
      
      expect(mockGetUserUsage).not.toHaveBeenCalled();
    });

    it('updates usage when user is logged in', async () => {
      const mockUser = { id: '123', email: 'test@test.com' };
      const mockUsage = { tokens_used: 700, tokens_limit: 2500, plan: 'trial' };
      
      useAuthStore.setState({ user: mockUser as any });
      mockGetUserUsage.mockResolvedValue(mockUsage);
      
      await useAuthStore.getState().refreshUsage();
      
      expect(mockGetUserUsage).toHaveBeenCalled();
      expect(useAuthStore.getState().usage).toEqual(mockUsage);
    });

    it('returns trial defaults for new user', async () => {
      const mockUser = { id: '123', email: 'test@test.com' };
      const trialDefaults = { tokens_used: 0, tokens_limit: 2500, plan: 'trial' };
      
      useAuthStore.setState({ user: mockUser as any });
      // getUserUsage returns trial defaults when no record found
      mockGetUserUsage.mockResolvedValue(trialDefaults);
      
      await useAuthStore.getState().refreshUsage();
      
      expect(useAuthStore.getState().usage).toEqual(trialDefaults);
    });
  });

  describe('logout', () => {
    it('clears user, session, and usage on logout', async () => {
      const mockUser = { id: '123', email: 'test@test.com' };
      const mockSession = { access_token: 'token123' };
      const mockUsage = { tokens_used: 100, tokens_limit: 2500, plan: 'trial' as const };
      
      useAuthStore.setState({ 
        user: mockUser as any, 
        session: mockSession as any,
        usage: mockUsage,
      });
      
      mockSignOut.mockResolvedValue({ error: null });
      
      await useAuthStore.getState().logout();
      
      expect(mockSignOut).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().usage).toBeNull();
    });
  });

  describe('Usage Display Integration', () => {
    it('provides reactive usage updates', () => {
      // Initial state
      expect(useAuthStore.getState().usage).toBeNull();
      
      // Update usage
      const newUsage = { tokens_used: 500, tokens_limit: 2500, plan: 'trial' as const };
      useAuthStore.getState().setUsage(newUsage);
      
      // Verify update is reflected
      expect(useAuthStore.getState().usage).toEqual(newUsage);
      expect(useAuthStore.getState().usage?.tokens_used).toBe(500);
    });

    it('calculates remaining tokens correctly', () => {
      const usage = { tokens_used: 1800, tokens_limit: 2500, plan: 'trial' as const };
      useAuthStore.getState().setUsage(usage);
      
      const state = useAuthStore.getState();
      const remaining = state.usage!.tokens_limit - state.usage!.tokens_used;
      
      expect(remaining).toBe(700);
    });
  });
});
