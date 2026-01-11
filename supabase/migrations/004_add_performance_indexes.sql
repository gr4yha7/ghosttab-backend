-- Add performance indexes for common queries

-- Tabs table indexes
CREATE INDEX IF NOT EXISTS idx_tabs_status_created 
ON tabs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tabs_creator_status 
ON tabs(creator_id, status);

CREATE INDEX IF NOT EXISTS idx_tabs_created_at 
ON tabs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tabs_status_deadline 
ON tabs(status, settlement_deadline) 
WHERE settlement_deadline IS NOT NULL;

-- Tab participants indexes
CREATE INDEX IF NOT EXISTS idx_tab_participants_paid 
ON tab_participants(paid) WHERE paid = false;

CREATE INDEX IF NOT EXISTS idx_tab_participants_user_paid 
ON tab_participants(user_id, paid);

CREATE INDEX IF NOT EXISTS idx_tab_participants_tab_paid 
ON tab_participants(tab_id, paid);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_created 
ON transactions(from_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_to_user_created 
ON transactions(to_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_status 
ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash 
ON transactions(tx_hash) WHERE tx_hash IS NOT NULL;

-- Friendships indexes
CREATE INDEX IF NOT EXISTS idx_friendships_status 
ON friendships(status);

CREATE INDEX IF NOT EXISTS idx_friendships_user_status 
ON friendships(user_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_friend_status 
ON friendships(friend_id, status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, read) WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_created 
ON notifications(created_at DESC);

-- Add comments for documentation
COMMENT ON INDEX idx_tabs_status_created IS 'Optimize queries filtering by status and sorting by creation date';
COMMENT ON INDEX idx_tab_participants_paid IS 'Optimize queries for unpaid participants';
COMMENT ON INDEX idx_transactions_tx_hash IS 'Optimize transaction hash lookups for settlement verification';
COMMENT ON INDEX idx_notifications_user_read IS 'Optimize queries for unread notifications';
