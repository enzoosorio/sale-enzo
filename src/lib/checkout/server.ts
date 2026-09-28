import 'server-only';
import { createClient } from '@/utils/supabase/server';
import type { CartSnapshot } from './schemas';

export { serviceClient } from './service';

export const emptyCart: CartSnapshot = { cart_id: null, revision: 0, pending_order: null, items: [] };

export async function getCart(): Promise<CartSnapshot> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return emptyCart;
  const { data, error } = await client.rpc('cart_snapshot');
  if (error) throw error;
  return (data as CartSnapshot | null) ?? emptyCart;
}

// Database exceptions are stable identifiers; the buyer sees a message, never the raw error.
const checkoutErrors: Record<string, string> = {
  'Item unavailable': 'Una prenda de tu carrito ya no está disponible.',
  'Item reserved': 'Otra persona está pagando una de tus prendas. Si no completa el pago en 15 minutos, volverá a estar disponible.',
  'Price changed': 'El precio de una prenda cambió. Revisa y acepta el nuevo precio en tu carrito.',
  'Total changed': 'El total cambió. Revisa tu carrito antes de continuar.',
  'Empty cart': 'Tu carrito está vacío.',
  'Cart limit reached': 'Tu carrito admite hasta 20 prendas.',
  'Invalid delivery': 'Elige una opción de entrega válida.',
  'Invalid contact': 'Revisa tus datos de contacto.',
  'Payment in progress': 'Tienes un pago en proceso. Espera su confirmación antes de iniciar otro.',
};

export function checkoutErrorMessage(message: string | undefined, fallback: string) {
  const known = Object.keys(checkoutErrors).find(key => message?.includes(key));
  return known ? checkoutErrors[known] : fallback;
}

export const paymentEnabled = () =>
  process.env.MERCADO_PAGO_CHECKOUT_ENABLED === 'true' && !!process.env.MERCADO_PAGO_ACCESS_TOKEN &&
  !!process.env.MERCADO_PAGO_WEBHOOK_SECRET && !!process.env.MERCADO_PAGO_COLLECTOR_ID &&
  !!process.env.SITE_URL?.startsWith('https://');
