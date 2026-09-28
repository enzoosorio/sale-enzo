import { describe, expect, it } from 'vitest';
import { paymentMatchesOrder } from './paymentMatch';

const order = { currency: 'PEN', total: '150.10' };
const payment = { currency_id: 'PEN', collector_id: 42, transaction_amount: 150.1 };

describe('provider payment verification', () => {
  it('accepts the exact amount, currency and recipient', () => {
    expect(paymentMatchesOrder(payment, order, 42)).toBe(true);
  });
  it('rejects a different amount, even by one cent', () => {
    expect(paymentMatchesOrder({ ...payment, transaction_amount: 150.09 }, order, 42)).toBe(false);
  });
  it('rejects another currency or another seller account', () => {
    expect(paymentMatchesOrder({ ...payment, currency_id: 'USD' }, order, 42)).toBe(false);
    expect(paymentMatchesOrder(payment, order, 7)).toBe(false);
    expect(paymentMatchesOrder(payment, order, Number(undefined))).toBe(false);
  });
});
