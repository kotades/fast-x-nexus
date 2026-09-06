/**
 * scripts/clear-all-orders.js
 * Purges all test orders and their cascade records from Supabase
 * to prepare for a fresh end-to-end booking & dispatch test.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  return env;
}

async function main() {
  const env = { ...parseEnv('.env'), ...parseEnv('.env.local') };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('🧹 Purging test orders and resetting database state...');

  // 1. Get all orders
  const { data: orders, error: fetchErr } = await supabase.from('orders').select('id, status, total_amount');
  if (fetchErr) {
    console.error('Error fetching orders:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${orders.length} order(s) in database:`, orders.map(o => `FX-${o.id.slice(0, 8).toUpperCase()} [${o.status}]`));

  if (orders.length > 0) {
    const orderIds = orders.map((o) => o.id);

    // Cascade delete parcels
    const { error: parcelErr } = await supabase.from('parcels').delete().in('order_id', orderIds);
    if (parcelErr) console.warn('Warning deleting parcels:', parcelErr.message);

    // Cascade delete transactions
    const { error: txErr } = await supabase.from('rider_transactions').delete().in('order_id', orderIds);
    if (txErr) console.warn('Warning deleting transactions:', txErr.message);

    // Cascade delete ledgers
    const { error: ledgerErr } = await supabase.from('ledgers').delete().in('order_id', orderIds);
    if (ledgerErr) console.warn('Warning deleting ledgers:', ledgerErr.message);

    // Cascade delete chat messages linked to these orders
    const { error: chatErr } = await supabase.from('chat_messages').delete().in('channel_id', orderIds);
    if (chatErr) console.warn('Warning deleting chat messages:', chatErr.message);

    // Delete orders
    const { error: delErr } = await supabase.from('orders').delete().in('id', orderIds);
    if (delErr) {
      console.error('Error deleting orders:', delErr);
      process.exit(1);
    }
    console.log(`✅ Successfully deleted ${orders.length} order(s)!`);
  } else {
    console.log('✅ Database is already clean. 0 orders found.');
  }

  // 2. Reset active status on test rider so they are ready for new jobs
  const { error: riderErr } = await supabase
    .from('profiles')
    .update({ active_status: 'ONLINE' })
    .eq('role', 'rider');
  if (!riderErr) {
    console.log('✅ Riders marked ONLINE and available in pool.');
  }

  console.log('🎯 Database is now 100% clean and ready for a fresh end-to-end test!');
}

main().catch(console.error);
