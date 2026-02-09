import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { validatePaymentRequest } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// M-Pesa sandbox configuration
const MPESA_BASE_URL = 'https://sandbox.safaricom.co.ke';
const MPESA_SHORTCODE = '174379';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request
    const rawBody = await req.json();
    const { phone, amount, orderId } = validatePaymentRequest(rawBody);

    console.log('Payment request received:', { phone: phone.slice(0, 6) + '****', amount, orderId });

    // Get M-Pesa credentials from environment
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const passkey = Deno.env.get('MPESA_PASSKEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!consumerKey || !consumerSecret) {
      throw new Error('M-Pesa credentials not configured');
    }

    if (!passkey) {
      throw new Error('M-Pesa passkey not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // Step 1: Get OAuth token
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token request failed:', errorText);
      throw new Error('Failed to get M-Pesa access token');
    }

    const { access_token } = await tokenResponse.json();
    console.log('Access token obtained successfully');

    // Step 2: Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = btoa(`${MPESA_SHORTCODE}${passkey}${timestamp}`);

    // Step 3: Build callback URL (use MPESA_CALLBACK_URL for local/ngrok testing, otherwise use Supabase URL)
    const callbackURL = Deno.env.get('MPESA_CALLBACK_URL') || `${supabaseUrl}/functions/v1/mpesa-callback`;

    // Step 4: Initiate STK Push
    const stkPushPayload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: callbackURL,
      AccountReference: orderId.slice(0, 12), // M-Pesa has 12 char limit
      TransactionDesc: `Order payment`,
    };

    console.log('Initiating STK push...');

    const stkResponse = await fetch(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPushPayload),
      }
    );

    const stkData = await stkResponse.json();
    console.log('STK Push response code:', stkData.ResponseCode);

    if (!stkResponse.ok || stkData.ResponseCode !== '0') {
      throw new Error(stkData.ResponseDescription || 'Failed to initiate payment');
    }

    // Step 5: Store CheckoutRequestID with order for callback matching
    if (stkData.CheckoutRequestID) {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

      const { data: existingOrder } = await supabaseClient
        .from('orders')
        .select('notes')
        .eq('id', orderId)
        .single();

      const existingNotes = existingOrder?.notes || '';
      const updatedNotes = existingNotes 
        ? `${existingNotes}\nCheckoutRequestID: ${stkData.CheckoutRequestID}`
        : `CheckoutRequestID: ${stkData.CheckoutRequestID}`;

      await supabaseClient
        .from('orders')
        .update({ notes: updatedNotes })
        .eq('id', orderId);

      console.log('Order updated with CheckoutRequestID');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment request sent. Please check your phone.',
        checkoutRequestId: stkData.CheckoutRequestID,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Payment error:', error instanceof Error ? error.message : 'Unknown error');
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});