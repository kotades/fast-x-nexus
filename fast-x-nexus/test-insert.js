require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: '26c7ae06-7cd0-43e6-a345-7c559f9ae766',
      status: 'PAID_UNASSIGNED',
      pickup_h3_cell: '8982db2d417ffff',
      dropoff_h3_cell: '895899a5bafffff',
      pickup_name: 'Sanni Invuoluwadunsimi',
      pickup_phone: '09014030047',
      pickup_address: '5.5643, 5.8459 (GPS Location)',
      dropoff_name: 'Sanni Bolu',
      dropoff_phone: '08101595840',
      dropoff_address: 'Atete Omatsone Street, Ubeji, Warri, Delt',
      preferred_delivery_time: '2026-07-09T03:30',
      total_amount: 2000
    })
    .select()
    .single();

  if (orderError) {
    console.error("Order Insert Error:", orderError);
    return;
  }
  console.log("Order Inserted:", order.id);

  const { error: parcelError } = await supabase
    .from('parcels')
    .insert({
      order_id: order.id,
      weight: 5,
      description: 'Standard Cargo',
      declared_value: 2000
    });

  if (parcelError) {
    console.error("Parcel Insert Error:", parcelError);
  } else {
    console.log("Parcel Inserted Successfully");
  }
}
run();
