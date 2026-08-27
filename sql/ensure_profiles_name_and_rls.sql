-- Ensure `name` column exists in `profiles` and add basic RLS policies.
-- Run this in the Supabase SQL editor (or via psql) for your project.

BEGIN;

-- Add the `name` column if missing
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS name text;

-- Add commonly used profile columns if missing to match app payload
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS weight numeric;
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS height integer;
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS profile text;

-- Enable row level security (no-op if already enabled)
ALTER TABLE IF EXISTS public.profiles
  ENABLE ROW LEVEL SECURITY;
-- Policy: allow the authenticated user to SELECT/INSERT/UPDATE/DELETE only their own profile row
-- DROP any existing policy and recreate (CREATE POLICY doesn't support IF NOT EXISTS)
DROP POLICY IF EXISTS profiles_is_owner ON public.profiles;
CREATE POLICY profiles_is_owner ON public.profiles
  FOR ALL
  USING (auth.uid()::uuid = id)
  WITH CHECK (auth.uid()::uuid = id);

COMMIT;

-- Create table to store per-user day titles (e.g., 'Empuje A')
BEGIN;

CREATE TABLE IF NOT EXISTS public.dias_usuario (
  user_id uuid NOT NULL,
  day_id text NOT NULL,
  title text,
  PRIMARY KEY (user_id, day_id)
);

ALTER TABLE IF EXISTS public.dias_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_manage_dias ON public.dias_usuario;
CREATE POLICY users_manage_dias ON public.dias_usuario
  FOR ALL
  USING (auth.uid()::uuid = user_id)
  WITH CHECK (auth.uid()::uuid = user_id);

COMMIT;
