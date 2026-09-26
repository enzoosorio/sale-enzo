import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validWebhookSignature } from './webhookSignature';

describe('Mercado Pago webhook authentication', () => {
  const secret = 'test-secret';
  const id = '123456';
  const requestId = 'request-1';
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = () => `ts=${ts},v1=${createHmac('sha256', secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex')}`;

  it('accepts the signed payment identifier and request', () => {
    expect(validWebhookSignature(id, requestId, signature(), secret)).toBe(true);
  });
  it('rejects tampered identifiers, requests and missing signatures', () => {
    expect(validWebhookSignature('123457', requestId, signature(), secret)).toBe(false);
    expect(validWebhookSignature(id, 'other', signature(), secret)).toBe(false);
    expect(validWebhookSignature(id, requestId, null, secret)).toBe(false);
  });
  it('rejects an expired timestamp', () => {
    const old = String(Math.floor(Date.now() / 1000) - 3600);
    const mac = createHmac('sha256', secret).update(`id:${id};request-id:${requestId};ts:${old};`).digest('hex');
    expect(validWebhookSignature(id, requestId, `ts=${old},v1=${mac}`, secret)).toBe(false);
  });
});
