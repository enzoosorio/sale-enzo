type Payment = { currency_id: string; collector_id: number; transaction_amount: number };
type Order = { currency: string; total: number | string };

/** A provider payment only counts if it matches the order's amount (to the cent), currency and recipient. */
export function paymentMatchesOrder(payment: Payment, order: Order, collectorId: number) {
  return Number.isFinite(collectorId) && payment.currency_id === order.currency && payment.collector_id === collectorId &&
    Math.round(payment.transaction_amount * 100) === Math.round(Number(order.total) * 100);
}
