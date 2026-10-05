import { lookupShopProduct } from './catalog.ts';
import { sumShopCents, toShopCents } from '../../utils/money.ts';
import type { ShopCartItem } from './inventory.ts';

export function calculateShopLine(item: ShopCartItem) {
  const product = lookupShopProduct(item.code);
  const unitCents = toShopCents(product.unitPrice);
  return {
    code: product.code,
    name: product.name,
    quantity: item.quantity,
    unitCents,
    lineCents: unitCents * item.quantity
  };
}

export function calculateShopDiscount(subtotalCents: number): number {
  if (subtotalCents >= toShopCents(200)) return Math.round(subtotalCents * 0.1);
  if (subtotalCents >= toShopCents(100)) return toShopCents(5);
  return 0;
}

export function quoteShopItems(cart: ShopCartItem[]) {
  const lines = cart.map(item => calculateShopLine(item));
  const subtotalCents = sumShopCents(lines.map(line => line.lineCents));
  const discountCents = calculateShopDiscount(subtotalCents);
  return { lines, subtotalCents, discountCents };
}

