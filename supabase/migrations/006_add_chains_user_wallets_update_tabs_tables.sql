-- 006_ghosttab_updates.sql
-- Phased GhostTab updates: Schema changes, recurrence support, and chain management

-- 1. Data Cleanup (Optional/Development only)
-- WARNING: This deletes all data. Comment out if not intended for production-like reset.
TRUNCATE TABLE settlement_history, transactions, tab_participants, tabs, friendships, user_groups, group_members, notifications, otp_codes, users CASCADE;

-- 2. Add Role to Users
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tab_split_type AS ENUM ('EVENLY', 'PERCENTAGE', 'SHARES', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'USER';

-- 3. Chains Table
CREATE TABLE IF NOT EXISTS chains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  vault_address TEXT NOT NULL,
  autosettle_supported BOOLEAN DEFAULT false,
  supported_currencies JSONB DEFAULT '[]'::jsonb, -- Array of objects: {name, symbol, address, decimals}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Wallets Table
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  chain_id UUID REFERENCES chains(id) ON DELETE CASCADE NOT NULL,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, chain_id)
);

-- 5. Tabs Table Updates
ALTER TABLE tabs 
ADD COLUMN IF NOT EXISTS payers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS onchain_tab_id TEXT,
ADD COLUMN IF NOT EXISTS chain_id UUID REFERENCES chains(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS frequency TEXT, -- ONLY group tabs can be recurring (check constraint added below)
ADD COLUMN IF NOT EXISTS split_type tab_split_type DEFAULT 'EVENLY',
ADD COLUMN IF NOT EXISTS penalty_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_recurred_at TIMESTAMPTZ;

-- 6. Add Constraint for Recurring Tabs
DO $$ BEGIN
    ALTER TABLE tabs ADD CONSTRAINT check_recurring_group_tab 
    CHECK (frequency IS NULL OR group_id IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. RLS Policies

-- Chains
ALTER TABLE chains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view chains" ON chains;
CREATE POLICY "Anyone can view chains" ON chains
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Only admins can manage chains" ON chains;
CREATE POLICY "Only admins can manage chains" ON chains
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = (SELECT auth.uid())::text
      AND users.role = 'ADMIN'
    )
  );

-- User Wallets
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own wallets" ON user_wallets;
CREATE POLICY "Users can manage their own wallets" ON user_wallets
  FOR ALL TO authenticated USING ((SELECT auth.uid())::text = user_id::text);

-- 8. Indices
CREATE INDEX IF NOT EXISTS idx_tabs_chain ON tabs(chain_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_chain ON user_wallets(chain_id);

-- 9. Triggers for updated_at
DROP TRIGGER IF EXISTS update_chains_updated_at ON chains;
CREATE TRIGGER update_chains_updated_at BEFORE UPDATE ON chains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_wallets_updated_at ON user_wallets;
CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON user_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
