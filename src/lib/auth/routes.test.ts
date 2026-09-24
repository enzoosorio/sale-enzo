import { describe, expect, it } from 'vitest';
import { isPrivatePage, isAdminApi, isAuthPage } from './routes';

describe('route access boundaries', () => {
  it.each(['/home', '/products', '/products/123', '/ropa', '/auth/callback', '/administrator'])('allows public route %s', path => {
    expect(isPrivatePage(path)).toBe(false);
  });
  it.each(['/admin', '/admin/staging/123', '/cart', '/orders/123', '/checkout'])('requires a session for %s', path => {
    expect(isPrivatePage(path)).toBe(true);
  });
  it('distinguishes API responses from page redirects', () => {
    expect(isAdminApi('/api/admin/extract')).toBe(true);
    expect(isAdminApi('/api/administrator')).toBe(false);
    expect(isAuthPage('/login')).toBe(true);
    expect(isAuthPage('/login-help')).toBe(false);
  });
});
