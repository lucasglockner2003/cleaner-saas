import { buildNextId, cloneDatabase, safeTrim } from "../helpers";

export function listProducts(db) {
  return db.products
    .map((product) => {
      const fillRate = product.low_stock_threshold
        ? Number(((product.quantity / product.low_stock_threshold) * 100).toFixed(0))
        : 100;
      const status =
        product.quantity <= 0
          ? "out"
          : product.quantity <= product.low_stock_threshold
            ? "low"
            : "healthy";

      return {
        ...product,
        status,
        fill_rate: fillRate
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

export function getInventoryInsights(db) {
  const products = listProducts(db);
  const low = products.filter((product) => product.status === "low");
  const out = products.filter((product) => product.status === "out");
  const healthy = products.filter((product) => product.status === "healthy");
  const totalStockValue = products.reduce((total, product) => total + product.quantity * (product.cost_per_unit ?? 0), 0);

  return {
    totals: {
      tracked: products.length,
      low: low.length,
      out: out.length,
      healthy: healthy.length,
      totalStockValue
    },
    atRisk: [...out, ...low]
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        fill_rate: item.fill_rate,
        status: item.status
      }))
      .sort((a, b) => a.fill_rate - b.fill_rate)
  };
}

export function adjustProductStock(db, productId, payload) {
  const mutable = cloneDatabase(db);
  const productIndex = mutable.products.findIndex((item) => item.id === productId);

  if (productIndex < 0) {
    return {
      db,
      ok: false,
      message: "Product not found."
    };
  }

  const quantity = Number(payload.quantity);
  if (Number.isNaN(quantity) || quantity <= 0) {
    return {
      db,
      ok: false,
      message: "Quantity must be greater than zero."
    };
  }

  const movementType = payload.movement_type === "in" ? "in" : "out";
  const current = mutable.products[productIndex];
  const nextQuantity = movementType === "in" ? current.quantity + quantity : Math.max(0, current.quantity - quantity);

  mutable.products[productIndex] = {
    ...current,
    quantity: nextQuantity
  };

  mutable.productMovements.push({
    id: buildNextId(mutable.productMovements, "pm-"),
    product_id: productId,
    movement_type: movementType,
    quantity,
    reason: safeTrim(payload.reason) || "Manual stock update",
    moved_at: new Date().toISOString(),
    visit_id: payload.visit_id ?? null
  });

  return {
    db: mutable,
    ok: true,
    message: "Stock updated."
  };
}
