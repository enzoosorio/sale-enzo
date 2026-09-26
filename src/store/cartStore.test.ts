import { describe, expect, it } from 'vitest';
import { isNewerSnapshot } from './cartStore';
import type { CartSnapshot } from '@/lib/checkout/schemas';

const snapshot = (cart_id: string | null, revision: number): CartSnapshot => ({ cart_id, revision, pending_order: null, items: [] });

describe('cart snapshot ordering', () => {
  it('ignores a stale response for the same cart', () => {
    expect(isNewerSnapshot(snapshot('a', 5), snapshot('a', 4))).toBe(false);
  });
  it('accepts newer or equal revisions (equal means an availability re-read)', () => {
    expect(isNewerSnapshot(snapshot('a', 5), snapshot('a', 6))).toBe(true);
    expect(isNewerSnapshot(snapshot('a', 5), snapshot('a', 5))).toBe(true);
  });
  it('always accepts a different cart after sign-in merge or sign-out', () => {
    expect(isNewerSnapshot(snapshot('guest', 9), snapshot('account', 2))).toBe(true);
  });
});
