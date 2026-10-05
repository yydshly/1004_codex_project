import React from 'react';
import { handleShopCatalogRequest } from '../server/routes/products.ts';
import { ShopSummary } from '../components/ShopSummary.tsx';

export default function MiniShopPage() {
  const products = handleShopCatalogRequest();
  const basket = [
    { code: 'tea-green', quantity: 2 },
    { code: 'mug-blue', quantity: 1 }
  ];

  return (
    <main>
      <header>
        <p>Mini Shop</p>
        <h1>Tea, coffee and small everyday things</h1>
        <p>{products.length} products available in this sample shop.</p>
      </header>
      <section aria-label="Product catalog">
        {products.map(product => (
          <article key={product.code}>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <p>Available: {product.available}</p>
          </article>
        ))}
      </section>
      <ShopSummary cart={basket} region="local" />
    </main>
  );
}
