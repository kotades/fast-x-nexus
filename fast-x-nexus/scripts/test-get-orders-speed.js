const fs = require('fs');

function parseEnv(filename) {
  const env = {};
  if (fs.existsSync(filename)) {
    const content = fs.readFileSync(filename, 'utf8');
    content.split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx !== -1 && !line.trim().startsWith('#')) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    });
  }
}
parseEnv('.env');
parseEnv('.env.local');

async function run() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: user } = await supabase.from('profiles').select('id, role').eq('role', 'customer').limit(1).single();
  console.log('Customer user:', user.id);

  const t0 = Date.now();
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      pickup_h3_cell,
      dropoff_h3_cell,
      total_amount,
      created_at,
      rider_id,
      parcels (
        weight,
        description,
        declared_value
      )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  console.log(`Direct DB Query took: ${Date.now() - t0}ms, returned ${orders ? orders.length : 0} orders. Error:`, error);
}

run();
