import React from 'react';
import { prepareShopCheckout } from '../server/services/checkout.ts';
import type { ShopCartItem } from '../server/services/inventory.ts';
import { formatShopMoney } from '../utils/money.ts';

type ShopSummaryProps = { cart: ShopCartItem[]; region?: string };

export function ShopSummary({ cart, region = 'local' }: ShopSummaryProps) {
  const quote = prepareShopCheckout(cart, region);

  return (
    <aside aria-label="Checkout preview">
      <h2>Your basket</h2>
      <ul>
        {quote.lines.map(line => (
          <li key={line.code}>
            {line.name} × {line.quantity} — {formatShopMoney(line.lineCents)}
          </li>
        ))}
      </ul>
      <dl>
        <dt>Subtotal</dt><dd>{formatShopMoney(quote.subtotalCents)}</dd>
        <dt>Discount</dt><dd>{formatShopMoney(quote.discountCents)}</dd>
        <dt>Shipping</dt><dd>{formatShopMoney(quote.shippingCents)}</dd>
        <dt>Total</dt><dd>{formatShopMoney(quote.totalCents)}</dd>
      </dl>
      <p>Estimated delivery: {quote.deliveryDays} days.</p>
      <p>This is a quote. Inventory is reserved only when an order is placed.</p>
    </aside>
  );
}
