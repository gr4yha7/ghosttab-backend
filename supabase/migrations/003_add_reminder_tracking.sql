-- Add reminder tracking columns to tab_participants
ALTER TABLE tab_participants
ADD COLUMN last_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN reminder_count INTEGER DEFAULT 0;

-- Create index for reminder queries
CREATE INDEX idx_tab_participants_reminder 
ON tab_participants(last_reminder_sent_at) 
WHERE paid = false;

-- Add comment for documentation
COMMENT ON COLUMN tab_participants.last_reminder_sent_at IS 'Timestamp of the last payment reminder sent to this participant';
COMMENT ON COLUMN tab_participants.reminder_count IS 'Total number of reminders sent to this participant';
