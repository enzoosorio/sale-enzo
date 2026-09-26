import 'server-only';
import { z } from 'zod';

const preferenceResponse = z.object({ id: z.string(), init_point: z.url() });
const paymentResponse = z.object({
  id: z.union([z.string(), z.number()]), status: z.string(),
  external_reference: z.string(), currency_id: z.string(),
  transaction_amount: z.number(), collector_id: z.number(),
});

function token() {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) throw new Error('Mercado Pago token missing');
  return process.env.MERCADO_PAGO_ACCESS_TOKEN;
}

export async function createPreference(order: {
  id: string; contact_email: string; reservation_expires_at: string;
  delivery_fee: number; delivery_label: string; subtotal: number;
  items: { title_snapshot: string; price: number }[];
}) {
  const site = process.env.SITE_URL;
  if (!site || !/^https:\/\//.test(site)) throw new Error('SITE_URL must be HTTPS');
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': order.id },
    body: JSON.stringify({
      items: [
        ...order.items.map(item => ({ title: item.title_snapshot, quantity: 1, unit_price: Number(item.price), currency_id: 'PEN' })),
        ...(Number(order.delivery_fee) > 0 ? [{ title: `Entrega: ${order.delivery_label}`, quantity: 1, unit_price: Number(order.delivery_fee), currency_id: 'PEN' }] : []),
      ],
      payer: { email: order.contact_email }, external_reference: order.id,
      back_urls: { success: `${site}/orders/${order.id}`, pending: `${site}/orders/${order.id}`, failure: `${site}/orders/${order.id}` },
      notification_url: `${site}/api/payments/mercado-pago/webhook`,
      auto_return: 'approved', expires: true,
      expiration_date_from: new Date().toISOString(), expiration_date_to: order.reservation_expires_at,
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }] },
    }),
  });
  if (!response.ok) throw new Error(`Mercado Pago preference: ${response.status}`);
  return preferenceResponse.parse(await response.json());
}

export async function getPayment(id: string) {
  if (!/^\d+$/.test(id)) throw new Error('Invalid payment id');
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${token()}` }, cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Mercado Pago payment: ${response.status}`);
  return paymentResponse.parse(await response.json());
}

export async function refundPayment(id: string, orderId: string) {
  if (!/^\d+$/.test(id)) throw new Error('Invalid payment id');
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}/refunds`, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `${orderId}-late-refund` },
    body: '{}',
  });
  if (!response.ok) throw new Error(`Mercado Pago refund: ${response.status}`);
}

