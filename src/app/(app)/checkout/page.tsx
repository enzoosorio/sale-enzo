import { redirect } from 'next/navigation';

// Purchases are closed over WhatsApp from the cart; online checkout is retired.
export default function Page() { redirect('/cart'); }
