-- Ensure RLS and policies for profiles, rutinas_usuario and historial

-- Enable RLS
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rutinas_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.historial ENABLE ROW LEVEL SECURITY;

-- Profiles policy
DROP POLICY IF EXISTS users_manage_profile ON public.profiles;
CREATE POLICY users_manage_profile ON public.profiles
  FOR ALL
  USING (auth.uid()::uuid = id)
  WITH CHECK (auth.uid()::uuid = id);

-- Rutinas policy
DROP POLICY IF EXISTS users_manage_rutinas ON public.rutinas_usuario;
CREATE POLICY users_manage_rutinas ON public.rutinas_usuario
  FOR ALL
  USING (auth.uid()::uuid = user_id)
  WITH CHECK (auth.uid()::uuid = user_id);

-- Historial policy
DROP POLICY IF EXISTS users_manage_historial ON public.historial;
CREATE POLICY users_manage_historial ON public.historial
  FOR ALL
  USING (auth.uid()::uuid = user_id)
  WITH CHECK (auth.uid()::uuid = user_id);

-- Optional: grant select to anon if you need public read (commented out)
-- GRANT SELECT ON public.rutinas_usuario TO anon;
