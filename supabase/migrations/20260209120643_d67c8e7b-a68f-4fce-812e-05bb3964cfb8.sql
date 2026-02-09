-- Drop all overloaded versions of complete_checkout, then recreate a single one
DROP FUNCTION IF EXISTS public.complete_checkout(uuid, text, numeric, numeric, jsonb, text, numeric);
DROP FUNCTION IF EXISTS public.complete_checkout(uuid, text, numeric, numeric, numeric, text, jsonb);

CREATE OR REPLACE FUNCTION public.complete_checkout(
  p_customer_id uuid,
  p_delivery_address text,
  p_delivery_lat numeric,
  p_delivery_lng numeric,
  p_total_amount numeric,
  p_notes text,
  p_items jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_supplier_id uuid;
  v_quantity integer;
  v_price numeric;
  v_stock integer;
BEGIN
  -- Create the order
  INSERT INTO orders (customer_id, delivery_address, delivery_location_lat, delivery_location_lng, total_amount, notes, status)
  VALUES (p_customer_id, p_delivery_address, p_delivery_lat, p_delivery_lng, p_total_amount, p_notes, 'pending')
  RETURNING id INTO v_order_id;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_supplier_id := (v_item->>'supplier_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price_at_purchase')::numeric;

    -- Lock and check stock
    SELECT stock_quantity INTO v_stock
    FROM products
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_product_id;
    END IF;

    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product: %', v_product_id;
    END IF;

    -- Deduct stock
    UPDATE products SET stock_quantity = stock_quantity - v_quantity WHERE id = v_product_id;

    -- Create order item
    INSERT INTO order_items (order_id, product_id, supplier_id, quantity, price_at_purchase)
    VALUES (v_order_id, v_product_id, v_supplier_id, v_quantity, v_price);
  END LOOP;

  -- Clear cart
  DELETE FROM cart_items WHERE user_id = p_customer_id;

  RETURN v_order_id::text;
END;
$$;