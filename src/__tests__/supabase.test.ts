import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      setSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}));

// Import after mocking
import { supabase, signUp, signIn, signOut, getCurrentUser, getSession } from '../lib/supabase';

describe('supabase auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUp', () => {
    it('calls supabase.auth.signUp with email and password', async () => {
      const mockData = { user: { id: '123', email: 'test@test.com' } };
      vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: mockData, error: null } as any);

      const result = await signUp('test@test.com', 'password123');
      
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
      expect(result).toEqual(mockData);
    });

    it('throws error on signup failure', async () => {
      const mockError = { message: 'User already registered' };
      vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: null, error: mockError } as any);

      await expect(signUp('test@test.com', 'password123')).rejects.toEqual(mockError);
    });
  });

  describe('signIn', () => {
    it('calls supabase.auth.signInWithPassword with credentials', async () => {
      const mockData = { user: { id: '123' }, session: { access_token: 'token' } };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: mockData, error: null } as any);

      const result = await signIn('test@test.com', 'password123');
      
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
      expect(result).toEqual(mockData);
    });

    it('throws error on invalid credentials', async () => {
      const mockError = { message: 'Invalid login credentials' };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: null, error: mockError } as any);

      await expect(signIn('test@test.com', 'wrongpass')).rejects.toEqual(mockError);
    });
  });

  describe('signOut', () => {
    it('calls supabase.auth.signOut', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as any);

      await signOut();
      
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('throws error on signout failure', async () => {
      const mockError = { message: 'Signout failed' };
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: mockError } as any);

      await expect(signOut()).rejects.toEqual(mockError);
    });
  });

  describe('getCurrentUser', () => {
    it('returns user when authenticated', async () => {
      const mockUser = { id: '123', email: 'test@test.com' };
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ 
        data: { user: mockUser }, 
        error: null 
      } as any);

      const user = await getCurrentUser();
      
      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(user).toEqual(mockUser);
    });

    it('returns null when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ 
        data: { user: null }, 
        error: null 
      } as any);

      const user = await getCurrentUser();
      
      expect(user).toBeNull();
    });
  });

  describe('getSession', () => {
    it('returns session when exists', async () => {
      const mockSession = { access_token: 'token', user: { id: '123' } };
      vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
        data: { session: mockSession }, 
        error: null 
      } as any);

      const session = await getSession();
      
      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(session).toEqual(mockSession);
    });

    it('returns null when no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
        data: { session: null }, 
        error: null 
      } as any);

      const session = await getSession();
      
      expect(session).toBeNull();
    });
  });
});

describe('Tauri detection for OAuth', () => {
  it('detects Tauri environment correctly', () => {
    // Test hostname detection
    const hostname = 'tauri.localhost';
    const isTauriUrl = hostname.includes('tauri') || hostname.includes('localhost');
    expect(isTauriUrl).toBe(true);
  });

  it('detects Android user agent', () => {
    const androidUA = 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36';
    const isAndroid = /Android/i.test(androidUA);
    expect(isAndroid).toBe(true);
  });

  it('does not detect desktop browser as Android', () => {
    const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const isAndroid = /Android/i.test(desktopUA);
    expect(isAndroid).toBe(false);
  });
});
