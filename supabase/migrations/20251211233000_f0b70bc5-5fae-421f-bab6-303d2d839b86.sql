-- Fix the Security Definer View issue by recreating the view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_supplier_profiles;

CREATE VIEW public.public_supplier_profiles 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.full_name,
  p.company_name,
  p.is_approved,
  p.created_at
FROM public.profiles p
WHERE p.is_approved = true
AND EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'supplier'
);

-- Grant access to the view
GRANT SELECT ON public.public_supplier_profiles TO authenticated;
GRANT SELECT ON public.public_supplier_profiles TO anon;