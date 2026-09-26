import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const auth = vi.hoisted(() => ({ claims: null as null | { sub: string; is_anonymous?: boolean } }));
const merge = vi.hoisted(() => ({ calls: [] as [string, string][], result: true }));
vi.mock('@/lib/checkout/service', () => ({
  mergeGuestCart: async (guest: string, owner: string) => { merge.calls.push([guest, owner]); return merge.result; },
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: { name: string; value: string; options: { path: string } }[]) => void } }) => ({
    auth: { getClaims: async () => {
      options.cookies.setAll([{ name: 'refreshed-session', value: 'test-token', options: { path: '/' } }]);
      return { data: { claims: auth.claims } };
    } },
  }),
}));

import { updateSession } from './supabase-middleware';
import { GUEST_CART_COOKIE, signGuestId } from '@/lib/checkout/guestCookie';

const guest = '3f2c7c1e-8b1a-4c1e-9f7a-2b1d6e0c9a11';
async function withGuestCookie(url: string) {
  const request = new NextRequest(url);
  request.cookies.set(GUEST_CART_COOKIE, (await signGuestId(guest))!);
  return request;
}

describe('session middleware', () => {
  beforeEach(() => {
    auth.claims = null; merge.calls = []; merge.result = true;
    process.env.CART_MERGE_SECRET = 'test-secret';
  });
  it('treats guests (anonymous sessions) as signed out for private pages', async () => {
    auth.claims = { sub: guest, is_anonymous: true };
    const response = await updateSession(new NextRequest('http://localhost/admin'));
    expect(response.headers.get('location')).toBe('http://localhost/login');
  });
  it('merges the guest cart on the first request after sign-in and clears the cookie', async () => {
    auth.claims = { sub: 'account-id' };
    const response = await updateSession(await withGuestCookie('http://localhost/home'));
    expect(merge.calls).toEqual([[guest, 'account-id']]);
    expect(response.cookies.get(GUEST_CART_COOKIE)?.value).toBe('');
  });
  it('keeps the cookie to retry when the merge fails', async () => {
    auth.claims = { sub: 'account-id' };
    merge.result = false;
    const response = await updateSession(await withGuestCookie('http://localhost/home'));
    expect(response.cookies.get(GUEST_CART_COOKIE)).toBeUndefined();
  });
  it('does not merge while the visitor is still a guest', async () => {
    auth.claims = { sub: guest, is_anonymous: true };
    await updateSession(await withGuestCookie('http://localhost/home'));
    expect(merge.calls).toEqual([]);
  });
  it('allows anonymous catalog requests', async () => {
    const response = await updateSession(new NextRequest('http://localhost/products?size=m'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
  it('preserves refreshed cookies when redirecting a private page', async () => {
    const response = await updateSession(new NextRequest('http://localhost/admin?secret=ignored'));
    expect(response.headers.get('location')).toBe('http://localhost/login');
    expect(response.cookies.get('refreshed-session')?.value).toBe('test-token');
  });
  it('returns a JSON 401 for anonymous admin APIs', async () => {
    const response = await updateSession(new NextRequest('http://localhost/api/admin/extract'));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(response.cookies.has('refreshed-session')).toBe(true);
  });
  it('leaves signed-in admin authorization to the layout and action checks', async () => {
    auth.claims = { sub: 'user-id' };
    const response = await updateSession(new NextRequest('http://localhost/admin'));
    expect(response.status).toBe(200);
  });
});
