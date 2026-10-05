import { normalizeShopCode } from '../../utils/ids.ts';
import { toShopCents } from '../../utils/money.ts';

export function calculateShopShipping(subtotalCents: number, region: string): number {
  const destination = normalizeShopCode(region);
  if (subtotalCents >= toShopCents(150)) return 0;
  return destination === 'local' ? toShopCents(8) : toShopCents(15);
}

export function estimateShopArrival(region: string): number {
  return normalizeShopCode(region) === 'local' ? 2 : 5;
}

