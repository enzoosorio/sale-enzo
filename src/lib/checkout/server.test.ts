import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));

import { checkoutErrorMessage } from './server';

describe('checkout error messages', () => {
  it('maps database exceptions to buyer-facing messages', () => {
    expect(checkoutErrorMessage('Item reserved', 'x')).toMatch(/Otra persona/);
    expect(checkoutErrorMessage('Price changed', 'x')).toMatch(/precio/);
  });
  it('never exposes unknown database errors', () => {
    expect(checkoutErrorMessage('relation "orders" does not exist', 'fallback')).toBe('fallback');
    expect(checkoutErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
