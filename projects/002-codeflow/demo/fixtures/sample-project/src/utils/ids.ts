import { createHash } from 'node:crypto';

export function normalizeShopCode(value: string): string {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function createShopReference(customer: string, basket: string): string {
  const owner = normalizeShopCode(customer);
  const fingerprint = createHash('sha256').update(owner + ':' + basket).digest('hex');
  return 'shop-' + fingerprint.slice(0, 10);
}

