import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const auth = vi.hoisted(() => ({ claims: null as null | { sub: string } }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: { name: string; value: string; options: { path: string } }[]) => void } }) => ({
    auth: { getClaims: async () => {
      options.cookies.setAll([{ name: 'refreshed-session', value: 'test-token', options: { path: '/' } }]);
      return { data: { claims: auth.claims } };
    } },
  }),
}));

import { updateSession } from './supabase-middleware';

describe('session middleware', () => {
  beforeEach(() => { auth.claims = null; });
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
