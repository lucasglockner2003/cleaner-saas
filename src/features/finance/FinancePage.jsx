import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { DataTable } from "../../components/ui/DataTable";
import { useAppData } from "../../hooks/useAppData";
import { financeService } from "../../services";
import { resolveOperationalDate, resolveOperationalMonth } from "../../utils/operationsDate";

export function FinancePage() {
  const { db } = useAppData();
  const defaultDate = resolveOperationalDate(db);
  const defaultMonth = resolveOperationalMonth(db, defaultDate);

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const daily = useMemo(() => financeService.getDailyFinanceSummary(db, selectedDate), [db, selectedDate]);
  const monthly = useMemo(() => financeService.getMonthlyFinanceSummary(db, selectedMonth), [db, selectedMonth]);
  const breakdown = useMemo(
    () => financeService.getMonthlyFinanceBreakdown(db, selectedMonth),
    [db, selectedMonth]
  );

  const columns = [
    { key: "category", label: "Cost Category" },
    {
      key: "amount",
      label: "Amount",
      render: (row) => `$${row.amount.toFixed(2)}`
    }
  ];

  return (
    <div className="page-grid">
      <section className="toolbar">
        <label>
          Daily Summary Date
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>
        <label>
          Monthly Aggregate
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </label>
      </section>

      <section className="stat-grid">
        <StatCard label="Completed Houses" value={daily.completedHouses} hint={`Date ${selectedDate}`} />
        <StatCard label="Total Revenue" value={`$${daily.revenue.toFixed(2)}`} hint="Visit revenue" />
        <StatCard label="Total Costs" value={`$${daily.totalCosts.toFixed(2)}`} hint="Gas + products + wages" />
        <StatCard label="Daily Profit" value={`$${daily.profit.toFixed(2)}`} hint="Revenue - costs" />
      </section>

      <section className="split-grid">
        <Card title="Daily financial summary" subtitle="Owner quick view for operational decisions">
          <div className="detail-list">
            <p>
              <span>Revenue per house</span>
              <strong>
                {daily.completedHouses ? `$${(daily.revenue / daily.completedHouses).toFixed(2)}` : "$0.00"}
              </strong>
            </p>
            <p>
              <span>Gas cost</span>
              <strong>${(daily.costByCategory.gas ?? 0).toFixed(2)}</strong>
            </p>
            <p>
              <span>Product cost</span>
              <strong>${(daily.costByCategory.products ?? 0).toFixed(2)}</strong>
            </p>
            <p>
              <span>Wage cost placeholder</span>
              <strong>${(daily.costByCategory.wages ?? 0).toFixed(2)}</strong>
            </p>
          </div>
        </Card>

        <Card title="Monthly aggregate summary">
          <div className="detail-list">
            <p>
              <span>Month</span>
              <strong>{selectedMonth}</strong>
            </p>
            <p>
              <span>Completed houses</span>
              <strong>{monthly.completedHouses}</strong>
            </p>
            <p>
              <span>Total revenue</span>
              <strong>${monthly.revenue.toFixed(2)}</strong>
            </p>
            <p>
              <span>Total costs</span>
              <strong>${monthly.totalCosts.toFixed(2)}</strong>
            </p>
            <p>
              <span>Estimated profit</span>
              <strong>${monthly.profit.toFixed(2)}</strong>
            </p>
            <p>
              <span>Average revenue per house</span>
              <strong>${monthly.averageRevenuePerHouse.toFixed(2)}</strong>
            </p>
          </div>
        </Card>
      </section>

      <Card title="Monthly cost composition">
        <DataTable columns={columns} rows={breakdown} />
      </Card>
    </div>
  );
}

