import { prepareShopCheckout } from './checkout.ts';
import { reserveShopStock } from './inventory.ts';
import type { ShopCartItem } from './inventory.ts';
import { createShopReference, normalizeShopCode } from '../../utils/ids.ts';
import { formatShopMoney } from '../../utils/money.ts';

type ShopOrder = {
  id: string;
  customer: string;
  status: string;
  items: ShopCartItem[];
  quote: ReturnType<typeof prepareShopCheckout>;
};
const shopOrders = new Map<string, ShopOrder>();

export function placeShopOrder(customer: string, cart: ShopCartItem[], region = 'local'): ShopOrder {
  const owner = normalizeShopCode(customer);
  if (!owner) throw new Error('Customer is required');
  const basket = JSON.stringify(cart) + ':' + region + ':' + shopOrders.size;
  const id = createShopReference(owner, basket);
  const quote = prepareShopCheckout(cart, region);
  reserveShopStock(cart);
  const order = { id, customer: owner, items: cart.map(item => ({ ...item })), quote, status: 'confirmed' };
  shopOrders.set(id, order);
  return order;
}

export function readShopOrder(id: string): ShopOrder {
  const normalized = normalizeShopCode(id);
  const order = shopOrders.get(normalized);
  if (!order) throw new Error('Order not found: ' + normalized);
  return order;
}

export function summarizeShopOrder(order: ShopOrder): string {
  const quantity = order.items.reduce((total, item) => total + item.quantity, 0);
  return order.id + ': ' + quantity + ' items, ' + formatShopMoney(order.quote.totalCents);
}

