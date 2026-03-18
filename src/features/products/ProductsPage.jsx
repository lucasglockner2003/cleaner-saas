import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { productsService } from "../../services";
import { formatDateTime } from "../../utils/dateTime";

function stockTone(status) {
  if (status === "healthy") return "success";
  if (status === "low") return "warning";
  return "danger";
}

function fillTone(fillRate) {
  if (fillRate >= 150) return "success";
  if (fillRate >= 100) return "neutral";
  if (fillRate >= 60) return "warning";
  return "danger";
}

export function ProductsPage() {
  const { db, actions } = useAppData();
  const products = productsService.listProducts(db);
  const movements = productsService.getProductMovementHistory(db);
  const insights = productsService.getInventoryInsights(db);

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const [movementType, setMovementType] = useState("out");
  const [movementQty, setMovementQty] = useState(1);
  const [movementReason, setMovementReason] = useState("Daily operational usage");

  const columns = [
    {
      key: "name",
      label: "Product",
      render: (row) => (
        <button type="button" className="table-link-btn" onClick={() => setSelectedProductId(row.id)}>
          {row.name}
        </button>
      )
    },
    {
      key: "quantity",
      label: "Quantity",
      render: (row) => `${row.quantity} ${row.unit}`
    },
    {
      key: "low_stock_threshold",
      label: "Low Threshold",
      render: (row) => `${row.low_stock_threshold} ${row.unit}`
    },
    {
      key: "fill_rate",
      label: "Fill %",
      render: (row) => <Badge value={`${row.fill_rate}%`} tone={fillTone(row.fill_rate)} />
    },
    {
      key: "status",
      label: "Stock Status",
      render: (row) => <Badge value={row.status} tone={stockTone(row.status)} />
    }
  ];

  const movementColumns = [
    { key: "product_name", label: "Product" },
    { key: "movement_type", label: "Movement" },
    {
      key: "quantity",
      label: "Quantity",
      render: (row) => row.quantity
    },
    { key: "reason", label: "Reason" },
    {
      key: "moved_at",
      label: "Moved At",
      render: (row) => formatDateTime(row.moved_at)
    }
  ];

  function submitMovement(event) {
    event.preventDefault();
    actions.adjustStock(selectedProductId, {
      movement_type: movementType,
      quantity: movementQty,
      reason: movementReason
    });
  }

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Tracked Products" value={insights.totals.tracked} hint="Inventory catalog" />
        <StatCard label="Low Stock Items" value={insights.totals.low} hint="Reorder needed soon" />
        <StatCard label="Out of Stock" value={insights.totals.out} hint="Dispatch risk" />
        <StatCard label="Inventory Value" value={`$${insights.totals.totalStockValue.toFixed(2)}`} hint="Approx stock value" />
      </section>

      <section className="split-grid">
        <Card title="Inventory control">
          <DataTable
            columns={columns}
            rows={products}
            empty={<EmptyState title="No products found" message="Inventory records will appear here." />}
          />
        </Card>

        <Card title="Stock movement action">
          <form className="page-grid compact-grid" onSubmit={submitMovement}>
            <label>
              Product
              <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Movement type
              <select value={movementType} onChange={(event) => setMovementType(event.target.value)}>
                <option value="out">Stock out (usage)</option>
                <option value="in">Stock in (restock)</option>
              </select>
            </label>

            <label>
              Quantity
              <input
                type="number"
                min={1}
                value={movementQty}
                onChange={(event) => setMovementQty(Number(event.target.value))}
              />
            </label>

            <label>
              Reason
              <input value={movementReason} onChange={(event) => setMovementReason(event.target.value)} />
            </label>

            <div className="form-actions">
              <button type="submit" className="btn">
                Record movement
              </button>
            </div>
          </form>
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Low stock watchlist">
          {insights.atRisk.length ? (
            <div className="stack-list">
              {insights.atRisk.map((item) => (
                <article key={item.id} className="row-item">
                  <div>
                    <strong>{item.name}</strong>
                    <p className="muted">
                      {item.quantity} {item.unit} remaining
                    </p>
                  </div>
                  <Badge value={`${item.fill_rate}%`} tone={fillTone(item.fill_rate)} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Stock healthy" message="No low-stock products right now." />
          )}
        </Card>

        <Card title="Movement history">
          <DataTable
            columns={movementColumns}
            rows={movements}
            empty={<EmptyState title="No movement records" message="Inventory movement logs will appear here." />}
          />
        </Card>
      </section>
    </div>
  );
}

