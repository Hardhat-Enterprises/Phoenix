-- Apply once to the existing notifications table before enabling global fan-out.
-- Each event is now unique per recipient, not globally unique.
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_event_id_key;

DROP INDEX IF EXISTS uq_notifications_event_id;

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES user_account(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass
      AND conname = 'notifications_event_id_user_id_unique'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_event_id_user_id_unique
      UNIQUE (event_id, user_id);
  END IF;
END $$;
