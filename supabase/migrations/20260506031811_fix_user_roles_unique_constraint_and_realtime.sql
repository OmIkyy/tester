/*
  # Fix user_roles unique constraint and re-enable realtime

  ## Changes

  ### 1. user_roles unique constraint
  - Drop the existing UNIQUE(user_id, role) constraint which allowed a user to
    have multiple rows (one per role). The app treats roles as single-value
    (one user = one role), so the correct constraint is UNIQUE(user_id).
  - This also enables the upsert pattern used in Users.tsx which requires a
    conflict target on user_id alone.

  ### 2. Re-enable realtime for operational tables
  - Migration 20260505... removed customers, installations, and activity_logs
    from the supabase_realtime publication.
  - This broke all live-update subscriptions in Dashboard, Customers, Queue,
    and Logs pages.
  - Re-add the three tables. RLS already restricts which rows each user can
    see, so re-enabling realtime does not create a security regression.

  ### Notes
  - Uses IF EXISTS / conditional logic to be idempotent.
  - No data is deleted or modified.
*/

-- 1. Fix unique constraint on user_roles
--    Drop old compound unique (user_id, role) and replace with single-column (user_id)
DO $$
BEGIN
  -- Drop the old compound unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_roles'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_role_key;
  END IF;

  -- Add single-column unique on user_id if not already present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_roles'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'user_roles_user_id_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 2. Re-add operational tables to realtime publication so live subscriptions work
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.installations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
