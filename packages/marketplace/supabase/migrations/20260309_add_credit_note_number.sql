-- Add credit_note_number to orders for post-completion refund tracking
ALTER TABLE orders ADD COLUMN credit_note_number TEXT;
