-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE friendship_status AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');
CREATE TYPE tab_status AS ENUM ('OPEN', 'SETTLED', 'CANCELLED');
CREATE TYPE transaction_type AS ENUM ('PAYMENT', 'SETTLEMENT', 'VAULT_DEPOSIT', 'VAULT_WITHDRAWAL');
CREATE TYPE notification_type AS ENUM (
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'TAB_CREATED',
  'TAB_UPDATED',
  'PAYMENT_RECEIVED',
  'PAYMENT_REMINDER',
  'TAB_SETTLED',
  'MESSAGE_RECEIVED'
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  privy_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  auto_settle BOOLEAN DEFAULT false,
  vault_address TEXT,
  stream_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_privy ON users(privy_id);

-- Friendships table
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status friendship_status DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

CREATE INDEX idx_friendships_user ON friendships(user_id);
CREATE INDEX idx_friendships_friend ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Tabs table
CREATE TABLE tabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  total_amount DECIMAL(20, 8) NOT NULL CHECK (total_amount > 0),
  currency TEXT DEFAULT 'MOVE',
  status tab_status DEFAULT 'OPEN',
  stream_channel_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tabs_creator ON tabs(creator_id);
CREATE INDEX idx_tabs_status ON tabs(status);
CREATE INDEX idx_tabs_created ON tabs(created_at DESC);

-- Tab participants table
CREATE TABLE tab_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tab_id UUID REFERENCES tabs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  share_amount DECIMAL(20, 8) NOT NULL CHECK (share_amount >= 0),
  paid BOOLEAN DEFAULT false,
  paid_amount DECIMAL(20, 8) DEFAULT 0 CHECK (paid_amount >= 0),
  paid_tx_hash TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tab_id, user_id)
);

CREATE INDEX idx_tab_participants_tab ON tab_participants(tab_id);
CREATE INDEX idx_tab_participants_user ON tab_participants(user_id);
CREATE INDEX idx_tab_participants_paid ON tab_participants(paid);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tab_id UUID REFERENCES tabs(id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'MOVE',
  tx_hash TEXT UNIQUE NOT NULL,
  type transaction_type NOT NULL,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_from ON transactions(from_user_id);
CREATE INDEX idx_transactions_to ON transactions(to_user_id);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_tab ON transactions(tab_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- OTP codes table
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_email ON otp_codes(email);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX idx_otp_used ON otp_codes(used);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tabs_updated_at BEFORE UPDATE ON tabs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tab_participants_updated_at BEFORE UPDATE ON tab_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tab_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Friendships policies
CREATE POLICY "Users can view their friendships" ON friendships
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.uid()::text = friend_id::text);

CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their friendships" ON friendships
  FOR UPDATE USING (auth.uid()::text = user_id::text OR auth.uid()::text = friend_id::text);

-- Tabs policies
CREATE POLICY "Users can view tabs they participate in" ON tabs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tab_participants
      WHERE tab_participants.tab_id = tabs.id
      AND tab_participants.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create tabs" ON tabs
  FOR INSERT WITH CHECK (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can update their tabs" ON tabs
  FOR UPDATE USING (auth.uid()::text = creator_id::text);

-- Tab participants policies
CREATE POLICY "Users can view participants of their tabs" ON tab_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tab_participants tp
      WHERE tp.tab_id = tab_participants.tab_id
      AND tp.user_id::text = auth.uid()::text
    )
  );

-- Transactions policies
CREATE POLICY "Users can view their transactions" ON transactions
  FOR SELECT USING (
    auth.uid()::text = from_user_id::text OR auth.uid()::text = to_user_id::text
  );

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE USING (auth.uid()::text = user_id::text);