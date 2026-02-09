-- 1. Create a view for public supplier profiles that excludes sensitive data
CREATE OR REPLACE VIEW public.public_supplier_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.company_name,
  p.is_approved,
  p.created_at
  -- Excludes: phone, location (sensitive data)
FROM public.profiles p
WHERE p.is_approved = true
AND EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'supplier'
);

-- 2. Grant access to the view
GRANT SELECT ON public.public_supplier_profiles TO authenticated;
GRANT SELECT ON public.public_supplier_profiles TO anon;

-- 3. Drop the overly permissive RLS policy on profiles
DROP POLICY IF EXISTS "Customers can view approved supplier profiles" ON public.profiles;