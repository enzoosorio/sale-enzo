// Signed pointer from the browser to its guest (anonymous) cart owner. httpOnly, so scripts never see it.
// Web Crypto keeps it usable from the proxy as well as route handlers.
export const GUEST_CART_COOKIE = 'se_guest_cart';
export const guestCookieOptions = {
  httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 30,
  secure: process.env.NODE_ENV === 'production',
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();

const hmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => new Uint8Array(hex.match(/../g)?.map(pair => parseInt(pair, 16)) ?? []);

export async function signGuestId(guestId: string, secret = process.env.CART_MERGE_SECRET) {
  if (!secret || !uuid.test(guestId)) return null;
  const mac = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(guestId));
  return `${guestId}.${toHex(mac)}`;
}

export async function verifyGuestCookie(value: string | undefined, secret = process.env.CART_MERGE_SECRET) {
  if (!secret || !value) return null;
  const [guestId, mac] = value.split('.');
  if (!guestId || !uuid.test(guestId) || !mac || !/^[0-9a-f]{64}$/i.test(mac)) return null;
  // subtle.verify compares in constant time.
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromHex(mac), encoder.encode(guestId));
  return valid ? guestId : null;
}
