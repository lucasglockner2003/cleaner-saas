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

export function ProductsPage() {
  const { db } = useAppData();
  const products = productsService.listProducts(db);
  const lowStockProducts = productsService.listLowStockProducts(db);
  const movements = productsService.getProductMovementHistory(db);

  const columns = [
    { key: "name", label: "Product" },
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

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Tracked Products" value={products.length} hint="Inventory catalog" />
        <StatCard label="Low Stock Items" value={lowStockProducts.length} hint="Reorder needed soon" />
        <StatCard label="Movement Records" value={movements.length} hint="Usage history placeholder" />
        <StatCard label="Inventory Module" value="Ready" hint="Low-stock alerts can be added later" />
      </section>

      <Card title="Product inventory">
        <DataTable
          columns={columns}
          rows={products}
          empty={<EmptyState title="No products found" message="Inventory records will appear here." />}
        />
      </Card>

      <section className="split-grid">
        <Card title="Low stock watchlist">
          {lowStockProducts.length ? (
            <ul className="simple-list">
              {lowStockProducts.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong> - {item.quantity} {item.unit} remaining (threshold {item.low_stock_threshold})
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Stock healthy" message="No low-stock products right now." />
          )}
        </Card>

        <Card title="Movement history placeholder">
          <DataTable
            columns={movementColumns}
            rows={movements.slice(0, 6)}
            empty={<EmptyState title="No movement records" message="Inventory movement logs will appear here." />}
          />
        </Card>
      </section>
    </div>
  );
}

