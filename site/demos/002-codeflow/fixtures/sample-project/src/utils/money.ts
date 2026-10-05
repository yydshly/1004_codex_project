import { normalizeShopCode } from './ids.ts';

export function toShopCents(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Amount must be a finite non-negative number');
  }
  return Math.round(amount * 100);
}

export function sumShopCents(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + Math.round(amount), 0);
}

export function formatShopMoney(cents: number, currency = 'CNY'): string {
  const code = normalizeShopCode(currency).toUpperCase();
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency', currency: code, minimumFractionDigits: 2
  }).format(cents / 100);
}

