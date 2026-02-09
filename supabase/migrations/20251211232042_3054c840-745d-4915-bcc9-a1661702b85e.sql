-- 1. Create a SECURITY DEFINER function for safe role assignment during signup
-- This prevents users from assigning themselves admin roles
CREATE OR REPLACE FUNCTION public.assign_initial_role(p_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow 'customer' or 'supplier' roles during self-assignment
  IF p_role NOT IN ('customer', 'supplier') THEN
    RAISE EXCEPTION 'Invalid role for self-assignment. Only customer or supplier roles are allowed.';
  END IF;
  
  -- Check if user already has a role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already has a role assigned.';
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), p_role);
END;
$$;

-- 2. Drop the insecure self-insert policy
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- 3. Create atomic checkout function to prevent race conditions
CREATE OR REPLACE FUNCTION public.complete_checkout(
  p_customer_id uuid,
  p_delivery_address text,
  p_delivery_lat numeric,
  p_delivery_lng numeric,
  p_total_amount numeric,
  p_notes text,
  p_items jsonb -- Array of {product_id, quantity, price_at_purchase, supplier_id}
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_current_stock int;
BEGIN
  -- Validate that caller is the customer
  IF auth.uid() != p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot create order for another user';
  END IF;

  -- Lock all products being purchased to prevent race conditions
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::int;
    
    -- Lock the product row and check stock
    SELECT stock_quantity INTO v_current_stock
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;
    
    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_product_id;
    END IF;
    
    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %', 
        v_product_id, v_current_stock, v_quantity;
    END IF;
  END LOOP;

  -- Create the order
  INSERT INTO public.orders (
    customer_id,
    delivery_address,
    delivery_location_lat,
    delivery_location_lng,
    total_amount,
    notes,
    status
  )
  VALUES (
    p_customer_id,
    p_delivery_address,
    p_delivery_lat,
    p_delivery_lng,
    p_total_amount,
    p_notes,
    'pending'
  )
  RETURNING id INTO v_order_id;

  -- Create order items and update stock atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::int;
    
    -- Insert order item
    INSERT INTO public.order_items (
      order_id,
      product_id,
      supplier_id,
      quantity,
      price_at_purchase
    )
    VALUES (
      v_order_id,
      v_product_id,
      (v_item->>'supplier_id')::uuid,
      v_quantity,
      (v_item->>'price_at_purchase')::numeric
    );
    
    -- Decrement stock
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_quantity
    WHERE id = v_product_id;
  END LOOP;

  -- Clear the user's cart
  DELETE FROM public.cart_items
  WHERE user_id = p_customer_id;

  RETURN v_order_id;
END;
$$;

-- 4. Grant execute permission on functions
GRANT EXECUTE ON FUNCTION public.assign_initial_role(app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_checkout(uuid, text, numeric, numeric, numeric, text, jsonb) TO authenticated;