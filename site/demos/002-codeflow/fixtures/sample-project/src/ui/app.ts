import { handleShopCatalogRequest, handleShopProductRequest } from '../server/routes/products.ts';
import { handleShopCheckoutRequest, handleShopOrderRequest } from '../server/routes/orders.ts';
import { renderShopCatalog, renderShopReceipt } from './components.ts';

export function renderMiniShopHome(category = ''): string {
  return renderShopCatalog(handleShopCatalogRequest(category));
}

export function runMiniShopDemo() {
  const home = renderMiniShopHome();
  const featured = handleShopProductRequest('tea-green');
  const basket = [
    { code: featured.code, quantity: 2 },
    { code: 'mug-blue', quantity: 1 }
  ];
  const checkout = handleShopCheckoutRequest('sample-customer', basket, 'local');
  const confirmed = handleShopOrderRequest(checkout.order.id);
  const receipt = renderShopReceipt(confirmed.summary, confirmed.order.quote.totalCents, confirmed.order.quote.deliveryDays);
  return { home, receipt, order: confirmed.order };
}

