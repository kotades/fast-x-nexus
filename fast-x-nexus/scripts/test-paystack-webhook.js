const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Helper to load environment variables from .env
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      env[match[1]] = value;
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = env.SUPABASE_SERVICE_ROLE_KEY;
const paystackSecretKey = env.PAYSTACK_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceRole || !paystackSecretKey) {
  console.error('❌ Missing required environment variables in .env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function runTest() {
  try {
    console.log('📡 Fetching or creating a test user profile...');
    // Fetch a user from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role')
      .limit(1);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    let customerId;
    if (profiles && profiles.length > 0) {
      customerId = profiles[0].id;
      console.log(`✅ Using existing profile ID: ${customerId}`);
    } else {
      // Create a test user profile
      customerId = '11111111-1111-1111-1111-111111111111';
      console.log(`ℹ️ Creating a mock user profile with ID: ${customerId}`);
      const { error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          id: customerId,
          role: 'customer',
          whatsapp_contact: '+2348030000000',
        });

      if (insertProfileError) {
        throw new Error(`Failed to create test profile: ${insertProfileError.message}`);
      }
    }

    console.log('📦 Creating a test order with status = PLACED and amount = ₦150.00...');
    const orderId = crypto.randomUUID();
    const { error: insertOrderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        customer_id: customerId,
        pickup_h3_cell: '8924300aa4bffff',
        dropoff_h3_cell: '8924300aa4b0000',
        total_amount: 150.00,
        status: 'PLACED',
      });

    if (insertOrderError) {
      throw new Error(`Failed to insert order: ${insertOrderError.message}`);
    }
    console.log(`✅ Order created successfully: ID = ${orderId}`);

    // Create the Paystack webhook mock payload
    // amount is in kobo (NGN subunits), so ₦150.00 = 15000 kobo
    const payload = {
      event: 'charge.success',
      data: {
        reference: `ref_test_${Date.now()}`,
        amount: 15000,
        metadata: {
          order_id: orderId,
        },
      },
    };

    const payloadString = JSON.stringify(payload);

    // Compute signature using Paystack secret key
    const computedSignature = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(payloadString)
      .digest('hex');

    console.log('📤 Sending mock payload to Next.js webhook route...');
    console.log(`Signature: ${computedSignature}`);

    const response = await fetch('http://localhost:3000/api/webhooks/paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': computedSignature,
      },
      body: payloadString,
    });

    const responseText = await response.text();
    console.log(`📥 Webhook Response [Status: ${response.status}]:`, responseText);

    if (response.status === 200) {
      console.log('🔎 Querying database to confirm state transition...');
      const { data: updatedOrder, error: queryError } = await supabase
        .from('orders')
        .select('status, total_amount')
        .eq('id', orderId)
        .single();

      if (queryError) {
        throw new Error(`Failed to query updated order: ${queryError.message}`);
      }

      console.log(`📊 Updated Order State: status = "${updatedOrder.status}"`);
      if (updatedOrder.status === 'PAID_UNASSIGNED') {
        console.log('🎉 SUCCESS: FSM state machine transitioned the order correctly!');
      } else {
        console.error('❌ FAILURE: Order state did not transition to PAID_UNASSIGNED!');
      }
    } else {
      console.error('❌ Webhook call failed.');
    }

  } catch (error) {
    console.error('💥 Test run failed with error:', error);
  }
}

runTest();
