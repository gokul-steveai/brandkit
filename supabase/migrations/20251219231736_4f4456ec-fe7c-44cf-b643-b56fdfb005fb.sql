-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Recreate with authenticated role (not public)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own profile" 
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());