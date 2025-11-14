-- Drop full_name column from users table
-- This column is no longer needed as we use 'username' instead

-- Check if the column exists before dropping
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'full_name'
    ) THEN
        ALTER TABLE users DROP COLUMN full_name;
        RAISE NOTICE 'Column full_name dropped successfully';
    ELSE
        RAISE NOTICE 'Column full_name does not exist, skipping';
    END IF;
END $$;
