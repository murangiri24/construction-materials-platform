-- Fix function search_path mutable warning
-- Update has_role function with explicit search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update assign_initial_role function with explicit search_path
CREATE OR REPLACE FUNCTION public.assign_initial_role(p_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent admin role self-assignment
  IF p_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot self-assign admin role';
  END IF;
  
  -- Check if user already has a role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RETURN;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), p_role);
END;
$$;

-- Update complete_checkout function with explicit search_path  
CREATE OR REPLACE FUNCTION public.complete_checkout(
  p_customer_id uuid,
  p_delivery_address text,
  p_delivery_lat numeric,
  p_delivery_lng numeric,
  p_items jsonb,
  p_notes text,
  p_total_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product record;
BEGIN
  -- Create the order
  INSERT INTO public.orders (
    customer_id,
    delivery_address,
    delivery_location_lat,
    delivery_location_lng,
    notes,
    total_amount,
    status
  ) VALUES (
    p_customer_id,
    p_delivery_address,
    p_delivery_lat,
    p_delivery_lng,
    p_notes,
    p_total_amount,
    'pending'
  ) RETURNING id INTO v_order_id;

  -- Process each cart item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Lock and get product details
    SELECT id, supplier_id, price, stock_quantity
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
    FOR UPDATE;

    IF v_product IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'product_id';
    END IF;

    IF v_product.stock_quantity < (v_item->>'quantity')::integer THEN
      RAISE EXCEPTION 'Insufficient stock for product: %', v_item->>'product_id';
    END IF;

    -- Create order item
    INSERT INTO public.order_items (
      order_id,
      product_id,
      supplier_id,
      quantity,
      price_at_purchase
    ) VALUES (
      v_order_id,
      v_product.id,
      v_product.supplier_id,
      (v_item->>'quantity')::integer,
      v_product.price
    );

    -- Update stock
    UPDATE public.products
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer
    WHERE id = v_product.id;
  END LOOP;

  -- Clear user's cart
  DELETE FROM public.cart_items WHERE user_id = p_customer_id;

  RETURN v_order_id;
END;
$$;