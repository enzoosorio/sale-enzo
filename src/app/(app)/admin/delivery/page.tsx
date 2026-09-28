import { createClient } from '@/utils/supabase/server';
import { AdminDelivery } from '@/components/admin/AdminDelivery';

export default async function Page() {
  const client = await createClient();
  const { data } = await client.from('delivery_options').select('id,kind,label,district,fee,active').order('label');
  return <AdminDelivery options={data ?? []} />;
}
