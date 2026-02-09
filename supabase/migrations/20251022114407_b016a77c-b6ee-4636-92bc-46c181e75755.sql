-- Fix critical security issues

-- 1. Fix profiles table RLS policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Customers can view approved supplier profiles (for company information)
CREATE POLICY "Customers can view approved supplier profiles"
ON public.profiles
FOR SELECT
USING (
  is_approved = true 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = profiles.id 
    AND role = 'supplier'::app_role
  )
);

-- 2. Fix order_items table RLS policies
DROP POLICY IF EXISTS "System can insert order items" ON public.order_items;

-- Only authenticated users creating their own orders can insert order items
CREATE POLICY "Users can insert order items for their orders"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.customer_id = auth.uid()
  )
);

-- Admins can insert order items
CREATE POLICY "Admins can insert order items"
ON public.order_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));