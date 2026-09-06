-- Migration: Add ai_chat_quota table for daily AI chat limits
CREATE TABLE IF NOT EXISTS ai_chat_quota (
  user_id uuid NOT NULL,
  date date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS ai_chat_quota_date_idx ON ai_chat_quota(date);
