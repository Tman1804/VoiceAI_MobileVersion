-- =====================================================
-- VoxWarp Database Schema für Supabase
-- Führe dieses SQL im Supabase SQL Editor aus
-- =====================================================

-- 1. User Usage Tabelle (Token-Verbrauch tracken)
CREATE TABLE IF NOT EXISTS public.user_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tokens_used INTEGER DEFAULT 0 NOT NULL,
  tokens_limit INTEGER DEFAULT 2500 NOT NULL,  -- Trial: 2500 Tokens
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'pro', 'unlimited')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Usage History (für Analytics)
CREATE TABLE IF NOT EXISTS public.usage_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tokens_used INTEGER NOT NULL,
  action TEXT NOT NULL,  -- 'transcription', 'enrichment'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Row Level Security aktivieren
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - User sieht nur eigene Daten
CREATE POLICY "Users can view own usage" ON public.user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own history" ON public.usage_history
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Service Role kann alles (für Edge Functions)
CREATE POLICY "Service can manage usage" ON public.user_usage
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage history" ON public.usage_history
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_usage_updated_at
  BEFORE UPDATE ON public.user_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Function: Neuen User automatisch anlegen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_usage (user_id, tokens_used, tokens_limit, plan)
  VALUES (NEW.id, 0, 2500, 'trial');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger: Bei neuem Auth User -> Usage anlegen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON public.user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_user_id ON public.usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_created_at ON public.usage_history(created_at);

-- =====================================================
-- Fertig! Das Schema ist jetzt bereit.
-- =====================================================
