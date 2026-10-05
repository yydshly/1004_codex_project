import React, { type ReactNode } from 'react';

export const metadata = {
  title: 'Mini Shop — CodeFlow sample',
  description: 'A small in-memory shop demonstrating real frontend and backend source relationships.'
};

export default function MiniShopLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mini-shop-shell">
          <nav aria-label="Main navigation"><a href="/">Mini Shop</a></nav>
          {children}
          <footer>Example shop · Inventory and orders live only in memory.</footer>
        </div>
      </body>
    </html>
  );
}
