-- VoxWarp Subscriptions Schema
-- Run this in Supabase SQL Editor after setting up Stripe

-- Subscriptions table to track Stripe subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'pro')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update (via Edge Functions)
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Update user_usage when subscription changes
CREATE OR REPLACE FUNCTION sync_usage_with_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- When subscription becomes active/pro, update tokens
  IF NEW.plan = 'pro' AND NEW.status = 'active' THEN
    UPDATE user_usage 
    SET plan = 'pro', 
        tokens_limit = 50000,
        tokens_used = 0  -- Reset tokens on new subscription
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- When subscription is canceled, revert to trial
  IF NEW.status = 'canceled' OR (NEW.cancel_at_period_end = TRUE AND NEW.current_period_end < NOW()) THEN
    UPDATE user_usage 
    SET plan = 'trial', 
        tokens_limit = 5000
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_subscription_to_usage
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_usage_with_subscription();

-- Update default trial tokens to 5000
UPDATE user_usage SET tokens_limit = 5000 WHERE plan = 'trial';

-- Also update the default in the schema (for new users)
-- Note: This assumes you have the user_usage table already
-- ALTER TABLE user_usage ALTER COLUMN tokens_limit SET DEFAULT 5000;
