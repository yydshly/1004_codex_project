import { placeShopOrder, readShopOrder, summarizeShopOrder } from '../services/orders.ts';
import type { ShopCartItem } from '../services/inventory.ts';

export function handleShopCheckoutRequest(customer: string, cart: ShopCartItem[], region = 'local') {
  const order = placeShopOrder(customer, cart, region);
  return { order, summary: summarizeShopOrder(order) };
}

export function handleShopOrderRequest(id: string) {
  const order = readShopOrder(id);
  return { order, summary: summarizeShopOrder(order) };
}

