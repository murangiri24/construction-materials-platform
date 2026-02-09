-- Create policy to allow service role to update orders for M-Pesa callback
CREATE POLICY "Service role can update orders"
ON orders
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);