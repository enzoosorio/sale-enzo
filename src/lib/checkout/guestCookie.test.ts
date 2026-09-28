import { describe, expect, it } from 'vitest';
import { signGuestId, verifyGuestCookie } from './guestCookie';

const secret = 'test-merge-secret';
const guest = '3f2c7c1e-8b1a-4c1e-9f7a-2b1d6e0c9a11';

describe('guest cart cookie', () => {
  it('round-trips a signed guest id', async () => {
    const cookie = await signGuestId(guest, secret);
    expect(await verifyGuestCookie(cookie!, secret)).toBe(guest);
  });
  it('rejects a cookie pointing at another guest cart', async () => {
    const cookie = await signGuestId(guest, secret);
    const forged = cookie!.replace(guest, '00000000-0000-4000-8000-000000000000');
    expect(await verifyGuestCookie(forged, secret)).toBeNull();
  });
  it('rejects other secrets, malformed values and a missing secret', async () => {
    const cookie = await signGuestId(guest, secret);
    expect(await verifyGuestCookie(cookie!, 'other-secret')).toBeNull();
    expect(await verifyGuestCookie('not-a-cookie', secret)).toBeNull();
    expect(await verifyGuestCookie(cookie!, '')).toBeNull();
    expect(await signGuestId('not-a-uuid', secret)).toBeNull();
  });
});
