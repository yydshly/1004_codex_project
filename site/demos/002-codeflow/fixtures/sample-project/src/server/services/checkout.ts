import { checkShopStock } from './inventory.ts';
import type { ShopCartItem } from './inventory.ts';
import { quoteShopItems } from './pricing.ts';
import { calculateShopShipping, estimateShopArrival } from './shipping.ts';
import { sumShopCents } from '../../utils/money.ts';

export function validateShopCart(cart: ShopCartItem[]): void {
  if (!cart.length) throw new Error('Cart is empty');
  for (const item of cart) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throw new Error('Quantity must be an integer between 1 and 20');
    }
  }
  if (!checkShopStock(cart)) throw new Error('Cart exceeds available inventory');
}

export function prepareShopCheckout(cart: ShopCartItem[], region = 'local') {
  validateShopCart(cart);
  const pricing = quoteShopItems(cart);
  const shippingCents = calculateShopShipping(pricing.subtotalCents, region);
  const discountedCents = pricing.subtotalCents - pricing.discountCents;
  const totalCents = sumShopCents([discountedCents, shippingCents]);
  return { ...pricing, shippingCents, totalCents, deliveryDays: estimateShopArrival(region) };
}

