const under = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + '/');
export const isAuthPage = (path: string) => path === '/login' || path === '/register';
export const isAdminApi = (path: string) => under(path, '/api/admin');
export const isPrivatePage = (path: string) =>
  ['/admin', '/account', '/orders', '/cart', '/favorites', '/checkout'].some(prefix => under(path, prefix));
