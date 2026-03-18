export function listProducts(db) {
  return db.products
    .map((product) => {
      const status =
        product.quantity <= 0
          ? "out"
          : product.quantity <= product.low_stock_threshold
            ? "low"
            : "healthy";

      return {
        ...product,
        status
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listLowStockProducts(db) {
  return listProducts(db).filter((product) => product.status !== "healthy");
}

export function getProductMovementHistory(db) {
  return db.productMovements
    .map((movement) => {
      const product = db.products.find((item) => item.id === movement.product_id);
      return {
        ...movement,
        product_name: product?.name ?? "-"
      };
    })
    .sort((a, b) => b.moved_at.localeCompare(a.moved_at));
}

