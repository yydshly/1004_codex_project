import { formatShopMoney, toShopCents } from '../utils/money.ts';
import { normalizeShopCode } from '../utils/ids.ts';

export function escapeShopText(text: string): string {
  return String(text).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character] ?? character));
}

export function renderShopCatalog(products: Array<{ code: string; name: string; unitPrice: number; available: number }>): string {
  const cards = products.map(product => {
    const price = formatShopMoney(toShopCents(product.unitPrice));
    const code = normalizeShopCode(product.code);
    return '<article data-product="' + code + '">' +
      '<h2>' + escapeShopText(product.name) + '</h2>' +
      '<p>' + escapeShopText(price) + ' · Stock ' + product.available + '</p></article>';
  });
  return '<section class="shop-catalog">' + cards.join('') + '</section>';
}

export function renderShopReceipt(summary: string, totalCents: number, deliveryDays: number): string {
  const total = formatShopMoney(totalCents);
  return '<section class="shop-receipt"><h2>Order confirmed</h2>' +
    '<p>' + escapeShopText(summary) + '</p>' +
    '<strong>' + escapeShopText(total) + '</strong>' +
    '<p>Estimated delivery: ' + deliveryDays + ' days</p></section>';
}

