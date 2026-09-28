import { validWebhookSignature } from '@/lib/checkout/webhookSignature';
import { reconcilePayment } from '@/lib/checkout/settle';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get('data.id') ?? '';
  const type = url.searchParams.get('type');
  if (type !== 'payment') return Response.json({ ignored: true });
  if (!validWebhookSignature(dataId, request.headers.get('x-request-id'), request.headers.get('x-signature')))
    return Response.json({ error: 'Firma inválida' }, { status: 401 });
  try {
    await reconcilePayment(dataId);
    return Response.json({ received: true });
  } catch (error) {
    console.error('Payment reconciliation failed', error);
    return Response.json({ error: 'Conciliación pendiente' }, { status: 503 });
  }
}
