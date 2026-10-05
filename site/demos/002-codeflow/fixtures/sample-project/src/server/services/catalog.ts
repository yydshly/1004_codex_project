import { normalizeShopCode } from '../../utils/ids.ts';
import { formatShopMoney, toShopCents } from '../../utils/money.ts';

export type ShopProduct = {
  code: string;
  name: string;
  unitPrice: number;
  stock: number;
  category: string;
};

const shopProducts: ShopProduct[] = [
  { code: 'tea-green', name: 'Green tea', unitPrice: 48, stock: 20, category: 'drink' },
  { code: 'coffee-dark', name: 'Dark coffee', unitPrice: 68, stock: 12, category: 'drink' },
  { code: 'mug-blue', name: 'Blue mug', unitPrice: 36, stock: 8, category: 'home' },
  { code: 'notebook', name: 'Pocket notebook', unitPrice: 22, stock: 15, category: 'home' }
];

export function listShopProducts(category = ''): ShopProduct[] {
  const selected = normalizeShopCode(category);
  return shopProducts.filter(product => !selected || product.category === selected)
    .map(product => ({ ...product }));
}

export function lookupShopProduct(code: string): ShopProduct {
  const normalized = normalizeShopCode(code);
  const product = shopProducts.find(item => item.code === normalized);
  if (!product) throw new Error('Unknown product: ' + normalized);
  return { ...product };
}

export function describeShopProduct(product: ShopProduct): string {
  const cents = toShopCents(product.unitPrice);
  return product.name + ' · ' + formatShopMoney(cents);
}

