-- Database function for spending by category analytics
CREATE OR REPLACE FUNCTION get_spending_by_category(
  p_user_id TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  category TEXT,
  tab_count BIGINT,
  total_spent NUMERIC,
  total_owed NUMERIC
) SET search_path = public, pg_temp AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(t.category::TEXT, 'OTHER') as category,
    COUNT(DISTINCT t.id) as tab_count,
    COALESCE(SUM(CASE WHEN tp.user_id = p_user_id THEN tp.share_amount ELSE 0 END), 0) as total_spent,
    COALESCE(SUM(CASE WHEN t.creator_id = p_user_id THEN t.total_amount ELSE 0 END), 0) as total_owed
  FROM tabs t
  LEFT JOIN tab_participants tp ON t.id = tp.tab_id
  WHERE (t.creator_id = p_user_id OR tp.user_id = p_user_id)
    AND t.created_at >= p_start_date
    AND t.created_at <= p_end_date
  GROUP BY t.category
  ORDER BY total_spent DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_spending_by_category IS 'Get spending analytics grouped by category for a user within a date range';
