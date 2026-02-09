-- Add unique constraint on cart_items to prevent duplicate entries
-- First, remove any existing duplicates
DELETE FROM cart_items a USING cart_items b
WHERE a.id > b.id 
AND a.user_id = b.user_id 
AND a.product_id = b.product_id;

-- Now add the unique constraint
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_user_product_unique 
UNIQUE (user_id, product_id);