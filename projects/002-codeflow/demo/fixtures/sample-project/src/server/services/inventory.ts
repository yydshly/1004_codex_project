import { listShopProducts, lookupShopProduct } from './catalog.ts';
import { normalizeShopCode } from '../../utils/ids.ts';

export type ShopCartItem = { code: string; quantity: number };
const shopStock = new Map(listShopProducts().map(product => [product.code, product.stock]));

export function readShopInventory(code: string): number {
  const product = lookupShopProduct(code);
  return shopStock.get(product.code) ?? 0;
}

export function checkShopStock(cart: ShopCartItem[]): boolean {
  const requested = new Map<string, number>();
  for (const item of cart) {
    const code = normalizeShopCode(item.code);
    requested.set(code, (requested.get(code) ?? 0) + item.quantity);
  }
  for (const [code, quantity] of requested) {
    if (readShopInventory(code) < quantity) return false;
  }
  return true;
}

export function reserveShopStock(cart: ShopCartItem[]): void {
  if (!checkShopStock(cart)) throw new Error('Not enough stock');
  for (const item of cart) {
    const code = normalizeShopCode(item.code);
    shopStock.set(code, readShopInventory(code) - item.quantity);
  }
}

