import { createClient } from '@/utils/supabase/server';
import { AdminOrders } from '@/components/admin/AdminOrders';

export default async function Page() {
  const client = await createClient();
  const { data: orders } = await client.from('orders').select('id,contact_name,contact_email,contact_phone,total,status,payment_status,created_at,order_items(title_snapshot,size_snapshot,product_item_id)').order('created_at', { ascending: false }).limit(100);
  return <AdminOrders initialOrders={orders ?? []} />;
}
