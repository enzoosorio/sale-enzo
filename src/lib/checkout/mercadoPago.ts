import 'server-only';
import { z } from 'zod';

const API = 'https://api.mercadopago.com';
const preferenceResponse = z.object({ id: z.string(), init_point: z.url() });
const paymentResponse = z.object({
  id: z.union([z.string(), z.number()]), status: z.string(),
  external_reference: z.string(), currency_id: z.string(),
  transaction_amount: z.number(), collector_id: z.number(),
});
const searchResponse = z.object({ results: z.array(z.object({ id: z.union([z.string(), z.number()]) })) });

export type ProviderPayment = z.infer<typeof paymentResponse>;

function token() {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) throw new Error('Mercado Pago token missing');
  return process.env.MERCADO_PAGO_ACCESS_TOKEN;
}

function numericId(id: string) {
  if (!/^\d+$/.test(id)) throw new Error('Invalid payment id');
  return id;
}

export async function createPreference(order: {
  id: string; attemptId: string; orderUrl: string; contact_email: string; reservation_expires_at: string;
  delivery_fee: number; delivery_label: string; items: { title_snapshot: string; price: number }[];
}) {
  const site = process.env.SITE_URL;
  if (!site || !/^https:\/\//.test(site)) throw new Error('SITE_URL must be HTTPS');
  const back = `${site}${order.orderUrl}`;
  const response = await fetch(`${API}/checkout/preferences`, {
    method: 'POST', cache: 'no-store',
    // One provider-side idempotency key per attempt: a network retry never creates two preferences.
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': order.attemptId },
    body: JSON.stringify({
      items: [
        ...order.items.map(item => ({ title: item.title_snapshot, quantity: 1, unit_price: Number(item.price), currency_id: 'PEN' })),
        ...(Number(order.delivery_fee) > 0 ? [{ title: `Entrega: ${order.delivery_label}`, quantity: 1, unit_price: Number(order.delivery_fee), currency_id: 'PEN' }] : []),
      ],
      payer: { email: order.contact_email }, external_reference: order.id,
      back_urls: { success: back, pending: back, failure: back },
      notification_url: `${site}/api/payments/mercado-pago/webhook`,
      auto_return: 'approved', expires: true,
      expiration_date_from: new Date().toISOString(), expiration_date_to: order.reservation_expires_at,
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }] },
    }),
  });
  if (!response.ok) throw new Error(`Mercado Pago preference: ${response.status}`);
  return preferenceResponse.parse(await response.json());
}

export async function getPayment(id: string): Promise<ProviderPayment> {
  const response = await fetch(`${API}/v1/payments/${numericId(id)}`, {
    headers: { Authorization: `Bearer ${token()}` }, cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Mercado Pago payment: ${response.status}`);
  return paymentResponse.parse(await response.json());
}

/** Payments for an order, for reconciliation when a webhook never arrived. */
export async function searchPaymentIds(orderId: string) {
  const query = new URLSearchParams({ external_reference: orderId, sort: 'date_created', criteria: 'desc' });
  const response = await fetch(`${API}/v1/payments/search?${query}`, {
    headers: { Authorization: `Bearer ${token()}` }, cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Mercado Pago search: ${response.status}`);
  return searchResponse.parse(await response.json()).results.map(result => String(result.id));
}

export async function refundPayment(id: string) {
  const response = await fetch(`${API}/v1/payments/${numericId(id)}/refunds`, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `refund-${id}` },
    body: '{}',
  });
  if (!response.ok) throw new Error(`Mercado Pago refund: ${response.status}`);
}
