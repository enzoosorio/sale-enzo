import { paymentEnabled } from '@/lib/checkout/server';
export async function GET() { return Response.json({ enabled: paymentEnabled() }); }
