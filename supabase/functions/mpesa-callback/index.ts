import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { sanitizeString } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Safaricom M-Pesa IP whitelist for production security
const SAFARICOM_IPS = [
  '196.201.214.200',
  '196.201.214.206',
  '196.201.213.114',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.213.44',
  '196.201.212.127',
  '196.201.212.128',
  '196.201.212.129',
  '196.201.212.132',
  '196.201.212.136',
  '196.201.212.138',
];

interface CallbackMetadataItem {
  Name: string;
  Value: string | number;
}

interface StkCallback {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: CallbackMetadataItem[];
  };
}

interface MpesaCallback {
  Body: {
    stkCallback: StkCallback;
  };
}

/**
 * Validates that the request originates from Safaricom's servers
 * PRODUCTION: IP whitelisting is ENABLED
 */
function isValidSafaricomRequest(req: Request): boolean {
  // Get client IP from headers (Deno Deploy / edge function headers)
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip')
    || req.headers.get('cf-connecting-ip'); // Cloudflare
  
  console.log('M-Pesa callback from IP:', clientIp);
  
  // Check if we're in sandbox mode (for development)
  const isSandbox = Deno.env.get('MPESA_SANDBOX') === 'true';
  
  if (isSandbox) {
    console.log('SANDBOX MODE: Skipping IP whitelist check');
    return true;
  }
  
  // PRODUCTION: Enforce IP whitelist
  if (!clientIp || !SAFARICOM_IPS.includes(clientIp)) {
    console.error('SECURITY ALERT: Rejected callback from non-whitelisted IP:', clientIp);
    return false;
  }
  
  console.log('IP validation passed for:', clientIp);
  return true;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request origin (IP whitelisting)
    if (!isValidSafaricomRequest(req)) {
      console.error('SECURITY: Rejected callback from unauthorized IP');
      // Still return 200 to avoid revealing security measures
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    const payload: MpesaCallback = await req.json();
    console.log('M-Pesa callback received');

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Extract callback data
    const { stkCallback } = payload.Body;
    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;

    console.log('Result Code:', ResultCode);
    console.log('CheckoutRequestID:', CheckoutRequestID);

    // Find order by CheckoutRequestID
    const { data: orders, error: findError } = await supabaseClient
      .from('orders')
      .select('id, notes')
      .ilike('notes', `%${CheckoutRequestID}%`)
      .limit(1);

    if (findError) {
      console.error('Error finding order:', findError.message);
    }

    const order = orders?.[0];

    // ResultCode 0 means success
    if (ResultCode === 0 && CallbackMetadata) {
      const metadata = CallbackMetadata.Item;
      const amount = metadata.find((item) => item.Name === 'Amount')?.Value;
      const mpesaReceiptNumber = metadata.find((item) => item.Name === 'MpesaReceiptNumber')?.Value;
      const phoneNumber = metadata.find((item) => item.Name === 'PhoneNumber')?.Value;

      console.log('Payment successful:', { amount, mpesaReceiptNumber });

      if (order) {
        // Sanitize receipt number before storing
        const safeReceipt = typeof mpesaReceiptNumber === 'string' 
          ? sanitizeString(mpesaReceiptNumber, 50) 
          : String(mpesaReceiptNumber);

        const { error: updateError } = await supabaseClient
          .from('orders')
          .update({ 
            status: 'confirmed',
            notes: `Payment confirmed. M-Pesa Receipt: ${safeReceipt}\nCheckoutRequestID: ${CheckoutRequestID}`
          })
          .eq('id', order.id);

        if (updateError) {
          console.error('Error updating order:', updateError.message);
        } else {
          console.log('Order confirmed:', order.id);
        }
      } else {
        console.error('No order found for CheckoutRequestID:', CheckoutRequestID);
      }
    } else {
      // Payment failed or cancelled
      console.log('Payment failed:', ResultDesc);
      
      if (order) {
        const safeDesc = sanitizeString(ResultDesc, 200);
        
        await supabaseClient
          .from('orders')
          .update({ 
            status: 'failed',
            notes: `Payment failed: ${safeDesc}\nCheckoutRequestID: ${CheckoutRequestID}`
          })
          .eq('id', order.id);
          
        console.log('Order marked as failed:', order.id);
      }
    }

    // Always return 200 to M-Pesa to acknowledge receipt
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Callback processing error:', error instanceof Error ? error.message : 'Unknown error');
    
    // Always return 200 to M-Pesa to prevent retries
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});