import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../hooks/useAppData";
import { financeService, invoicesService } from "../../services";
import { resolveOperationalDate, resolveOperationalMonth } from "../../utils/operationsDate";

function profitTone(value) {
  if (value > 0) return "success";
  if (value < 0) return "danger";
  return "muted";
}

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
  const dailyRows = useMemo(() => financeService.getDailyVisitFinanceRows(db, selectedDate), [db, selectedDate]);
  const trendRows = useMemo(() => financeService.getMonthlyTrend(db, selectedMonth), [db, selectedMonth]);
  const insights = useMemo(() => financeService.getOperationalFinanceInsights(db, selectedMonth), [db, selectedMonth]);
  const monthlyInvoices = useMemo(
    () => invoicesService.listInvoices(db).filter((invoice) => invoice.period_start.startsWith(selectedMonth)),
    [db, selectedMonth]
  );
  const invoiceSummary = useMemo(() => {
    return monthlyInvoices.reduce(
      (acc, invoice) => {
        acc.total += 1;
        acc[invoice.status] = (acc[invoice.status] ?? 0) + 1;
        acc.balanceDue += invoice.balance_due ?? 0;
        acc.totalAmount += invoice.total ?? 0;
        return acc;
      },
      {
        total: 0,
        draft: 0,
        issued: 0,
        paid: 0,
        failed: 0,
        balanceDue: 0,
        totalAmount: 0
      }
    );
  }, [monthlyInvoices]);

  const marginPct = daily.revenue ? Number(((daily.profit / daily.revenue) * 100).toFixed(1)) : 0;

  const breakdownColumns = [
    { key: "category", label: "Cost Category" },
    {
      key: "amount",
      label: "Amount",
      render: (row) => `$${row.amount.toFixed(2)}`
    }
  ];

  const dailyVisitColumns = [
    { key: "client_name", label: "Client" },
    { key: "team_name", label: "Team" },
    { key: "suburb", label: "Suburb" },
    {
      key: "revenue",
      label: "Revenue",
      render: (row) => `$${row.revenue.toFixed(2)}`
    },
    {
      key: "estimatedCost",
      label: "Est. Cost",
      render: (row) => `$${row.estimatedCost.toFixed(2)}`
    },
    {
      key: "profit",
      label: "Profit",
      render: (row) => <Badge value={`$${row.profit.toFixed(2)}`} tone={profitTone(row.profit)} />
    },
    {
      key: "marginPct",
      label: "Margin",
      render: (row) => `${row.marginPct}%`
    }
  ];

  const trendColumns = [
    { key: "date", label: "Date" },
    { key: "revenue", label: "Revenue", render: (row) => `$${row.revenue.toFixed(2)}` },
    { key: "costs", label: "Costs", render: (row) => `$${row.costs.toFixed(2)}` },
    {
      key: "profit",
      label: "Profit",
      render: (row) => <Badge value={`$${row.profit.toFixed(2)}`} tone={profitTone(row.profit)} />
    }
  ];

  const teamColumns = [
    { key: "team_name", label: "Team" },
    { key: "visits", label: "Completed Visits" },
    { key: "revenue", label: "Revenue", render: (row) => `$${row.revenue.toFixed(2)}` },
    { key: "costs", label: "Costs", render: (row) => `$${row.costs.toFixed(2)}` },
    { key: "profit", label: "Profit", render: (row) => `$${row.profit.toFixed(2)}` }
  ];

  const suburbColumns = [
    { key: "suburb", label: "Suburb" },
    { key: "visits", label: "Completed Visits" },
    { key: "revenue", label: "Revenue", render: (row) => `$${row.revenue.toFixed(2)}` }
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
        <StatCard label="Daily Profit" value={`$${daily.profit.toFixed(2)}`} hint={`Margin ${marginPct}%`} />
      </section>

      <section className="stat-grid">
        <StatCard label="Invoices (month)" value={invoiceSummary.total} hint={selectedMonth} />
        <StatCard label="Issued" value={invoiceSummary.issued} hint="Open billing cycle" />
        <StatCard label="Paid" value={invoiceSummary.paid} hint="Collected" />
        <StatCard label="Balance Due" value={`$${invoiceSummary.balanceDue.toFixed(2)}`} hint="Outstanding receivables" />
      </section>

      <section className="split-grid">
        <Card title="Daily financial breakdown" subtitle="Operational profitability and cost pressure indicators">
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
              <span>Wage cost</span>
              <strong>${(daily.costByCategory.wages ?? 0).toFixed(2)}</strong>
            </p>
            <p>
              <span>Profit margin</span>
              <strong>{marginPct}%</strong>
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
            <p>
              <span>Best profit day</span>
              <strong>
                {insights.bestProfitDay
                  ? `${insights.bestProfitDay.date} ($${insights.bestProfitDay.profit.toFixed(2)})`
                  : "-"}
              </strong>
            </p>
          </div>
        </Card>
      </section>

      <Card title="Daily house-level financial insight">
        <DataTable
          columns={dailyVisitColumns}
          rows={dailyRows}
          empty={<EmptyState title="No visit rows" message="No visits found for this day." />}
        />
      </Card>

      <section className="split-grid">
        <Card title="Monthly cost composition">
          <DataTable columns={breakdownColumns} rows={breakdown} />
        </Card>

        <Card title="Monthly trend">
          <DataTable
            columns={trendColumns}
            rows={trendRows}
            empty={<EmptyState title="No trend data" message="No visits found for this month." />}
          />
        </Card>
      </section>

      <Card title="Invoice collection snapshot">
        <div className="detail-list">
          <p>
            <span>Total invoice value</span>
            <strong>${invoiceSummary.totalAmount.toFixed(2)}</strong>
          </p>
          <p>
            <span>Draft invoices</span>
            <strong>{invoiceSummary.draft}</strong>
          </p>
          <p>
            <span>Issued invoices</span>
            <strong>{invoiceSummary.issued}</strong>
          </p>
          <p>
            <span>Paid invoices</span>
            <strong>{invoiceSummary.paid}</strong>
          </p>
          <p>
            <span>Failed invoices</span>
            <strong>{invoiceSummary.failed}</strong>
          </p>
          <p>
            <span>Outstanding balance due</span>
            <strong>${invoiceSummary.balanceDue.toFixed(2)}</strong>
          </p>
        </div>
      </Card>

      <section className="split-grid">
        <Card title="Revenue and profit by team">
          <DataTable
            columns={teamColumns}
            rows={insights.byTeam}
            empty={<EmptyState title="No team insights" message="No completed visits for this month." />}
          />
        </Card>

        <Card title="Revenue by suburb">
          <DataTable
            columns={suburbColumns}
            rows={insights.bySuburb}
            empty={<EmptyState title="No suburb insights" message="No completed visits for this month." />}
          />
        </Card>
      </section>
    </div>
  );
}
