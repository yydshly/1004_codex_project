import { describeShopProduct, listShopProducts, lookupShopProduct } from '../services/catalog.ts';
import { readShopInventory } from '../services/inventory.ts';

export function handleShopCatalogRequest(category = '') {
  return listShopProducts(category).map(product => ({
    ...product,
    description: describeShopProduct(product),
    available: readShopInventory(product.code)
  }));
}

export function handleShopProductRequest(code: string) {
  const product = lookupShopProduct(code);
  return { ...product, description: describeShopProduct(product), available: readShopInventory(code) };
}

