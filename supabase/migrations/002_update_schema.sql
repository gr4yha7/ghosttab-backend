-- Add deadline and penalty fields to tabs
ALTER TABLE tabs 
ADD COLUMN settlement_deadline TIMESTAMPTZ,
ADD COLUMN penalty_rate DECIMAL(5,2) DEFAULT 5.00, -- 5% default penalty
ADD COLUMN auto_settle_enabled BOOLEAN DEFAULT false;

-- Add settlement metadata to tab_participants
ALTER TABLE tab_participants
ADD COLUMN settled_early BOOLEAN DEFAULT false,
ADD COLUMN days_late INTEGER DEFAULT 0,
ADD COLUMN penalty_amount DECIMAL(20,8) DEFAULT 0,
ADD COLUMN final_amount DECIMAL(20,8); -- share_amount + penalty

-- Create index for deadline queries
CREATE INDEX idx_tabs_deadline ON tabs(settlement_deadline) 
WHERE status = 'OPEN';

-- Add trust score to users
ALTER TABLE users
ADD COLUMN trust_score INTEGER DEFAULT 100, -- Start at 100
ADD COLUMN settlements_on_time INTEGER DEFAULT 0,
ADD COLUMN settlements_late INTEGER DEFAULT 0,
ADD COLUMN total_settlements INTEGER DEFAULT 0,
ADD COLUMN avg_settlement_days DECIMAL(10,2);

CREATE INDEX idx_users_trust_score ON users(trust_score DESC);

-- Create settlement history table
CREATE TABLE settlement_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tab_id UUID REFERENCES tabs(id) ON DELETE CASCADE,
  settled_on_time BOOLEAN NOT NULL,
  days_late INTEGER DEFAULT 0,
  penalty_amount DECIMAL(20,8),
  trust_score_before INTEGER,
  trust_score_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settlement_history_user ON settlement_history(user_id);
CREATE INDEX idx_settlement_history_created ON settlement_history(created_at DESC);

-- Create category enum
CREATE TYPE tab_category AS ENUM (
  'DINING',
  'TRAVEL',
  'GROCERIES',
  'ENTERTAINMENT',
  'UTILITIES',
  'GIFTS',
  'TRANSPORTATION',
  'ACCOMMODATION',
  'OTHER'
);

-- Update tabs table
ALTER TABLE tabs
DROP COLUMN icon,
ADD COLUMN category tab_category DEFAULT 'OTHER';

CREATE INDEX idx_tabs_category ON tabs(category);

-- Add verified column to tab_participants
ALTER TABLE tab_participants
ADD COLUMN verified BOOLEAN DEFAULT false,
ADD COLUMN otp_sent_at TIMESTAMPTZ,
ADD COLUMN verification_deadline TIMESTAMPTZ;

CREATE INDEX idx_tab_participants_verified 
ON tab_participants(verified) WHERE verified = false;

-- Update OTP type enum
ALTER TYPE notification_type ADD VALUE 'TAB_PARTICIPATION';
-- Add new notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GROUP_CREATED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GROUP_MEMBER_ADDED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GROUP_MEMBER_REMOVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GROUP_ROLE_UPDATED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GROUP_TAB_CREATED';

-- Create group role enum
CREATE TYPE group_role AS ENUM ('CREATOR', 'ADMIN', 'MEMBER');

-- User Groups table
CREATE TABLE user_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  stream_channel_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_creator ON user_groups(creator_id);
CREATE INDEX idx_groups_created ON user_groups(created_at DESC);

-- Group Members table
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES user_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role group_role DEFAULT 'MEMBER' NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_role ON group_members(role);

-- Add group_id to tabs table
ALTER TABLE tabs
ADD COLUMN group_id UUID REFERENCES user_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_tabs_group ON tabs(group_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Triggers
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON user_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Users can view groups they're members of
CREATE POLICY "Users can view their groups" ON user_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = user_groups.id
        AND group_members.user_id::text = (SELECT auth.uid())::text
    )
  );

-- Users can create groups
CREATE POLICY "Users can create groups" ON user_groups
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid())::text = creator_id::text);

-- Only creator and admins can update groups
CREATE POLICY "Admins can update groups" ON user_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = user_groups.id
        AND group_members.user_id::text = (SELECT auth.uid())::text
        AND group_members.role IN ('CREATOR', 'ADMIN')
    )
  );

-- Users can view group members
CREATE POLICY "Users can view group members" ON group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id::text = (SELECT auth.uid())::text
    )
  );

-- Users: view their own profile
ALTER POLICY "Users can view their own profile" ON users
  TO authenticated
  USING ((SELECT auth.uid())::text = id::text);

-- Users: update their own profile
ALTER POLICY "Users can update their own profile" ON users
  TO authenticated
  USING ((SELECT auth.uid())::text = id::text);

-- Friendships policies
ALTER POLICY "Users can view their friendships" ON friendships
  TO authenticated
  USING (
    (SELECT auth.uid())::text = user_id::text
    OR (SELECT auth.uid())::text = friend_id::text
  );

ALTER POLICY "Users can create friendships" ON friendships
  TO authenticated
  WITH CHECK ((SELECT auth.uid())::text = user_id::text);

ALTER POLICY "Users can update their friendships" ON friendships
  TO authenticated
  USING (
    (SELECT auth.uid())::text = user_id::text
    OR (SELECT auth.uid())::text = friend_id::text
  );

-- Tabs policies
ALTER POLICY "Users can view tabs they participate in" ON tabs
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tab_participants
      WHERE tab_participants.tab_id = tabs.id
        AND tab_participants.user_id::text = (SELECT auth.uid())::text
    )
  );

ALTER POLICY "Users can create tabs" ON tabs
  TO authenticated
  WITH CHECK ((SELECT auth.uid())::text = creator_id::text);

ALTER POLICY "Creators can update their tabs" ON tabs
  TO authenticated
  USING ((SELECT auth.uid())::text = creator_id::text);

-- Tab participants policies
ALTER POLICY "Users can view participants of their tabs" ON tab_participants
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tab_participants tp
      WHERE tp.tab_id = tab_participants.tab_id
        AND tp.user_id::text = (SELECT auth.uid())::text
    )
  );

-- Transactions policies
ALTER POLICY "Users can view their transactions" ON transactions
  TO authenticated
  USING (
    (SELECT auth.uid())::text = from_user_id::text
    OR (SELECT auth.uid())::text = to_user_id::text
  );

-- Notifications policies
ALTER POLICY "Users can view their notifications" ON notifications
  TO authenticated
  USING ((SELECT auth.uid())::text = user_id::text);

ALTER POLICY "Users can update their notifications" ON notifications
  TO authenticated
  USING ((SELECT auth.uid())::text = user_id::text);

CREATE POLICY "Users can delete their notifications" ON notifications
  FOR DELETE TO authenticated USING ((SELECT auth.uid())::text = user_id::text);

ALTER TABLE settlement_history ENABLE ROW LEVEL SECURITY;

-- Users can only READ their history
CREATE POLICY "Users can view their settlement history" ON settlement_history
  FOR SELECT TO authenticated USING ((SELECT auth.uid())::text = user_id::text);