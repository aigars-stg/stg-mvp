-- Fix: Allow NULL sender_id for system messages
-- The messages table was created with sender_id NOT NULL, but system messages need NULL sender

-- Step 1: Drop the NOT NULL constraint on sender_id
ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;

-- Step 2: Add a check constraint to ensure either sender_id is set OR is_system_message is true
ALTER TABLE messages ADD CONSTRAINT messages_sender_or_system
  CHECK (sender_id IS NOT NULL OR is_system_message = true);

-- Step 3: Add comment explaining the constraint
COMMENT ON CONSTRAINT messages_sender_or_system ON messages IS
  'Ensures regular messages have a sender, while system messages (is_system_message=true) can have NULL sender_id';

-- Step 4: Recreate the function with explicit handling (no changes needed, just documenting)
-- The existing post_transaction_system_message function already passes NULL for sender_id,
-- which will now work with the updated constraint.
