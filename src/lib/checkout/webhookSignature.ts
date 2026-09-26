import { createHmac, timingSafeEqual } from 'node:crypto';

export function validWebhookSignature(dataId: string, requestId: string | null, signature: string | null, secret: string | undefined = process.env.MERCADO_PAGO_WEBHOOK_SECRET) {
  if (!secret || !signature || !requestId || !/^\d+$/.test(dataId)) return false;
  const parts = Object.fromEntries(signature.split(',').map(part => part.trim().split('=')));
  if (!parts.ts || !parts.v1 || !/^\d+$/.test(parts.ts) || !/^[a-f0-9]{64}$/i.test(parts.v1)) return false;
  const ts = Number(parts.ts);
  if (Math.abs(Date.now() - (ts < 1e11 ? ts * 1000 : ts)) > 10 * 60_000) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  return timingSafeEqual(expected, Buffer.from(parts.v1, 'hex'));
}
