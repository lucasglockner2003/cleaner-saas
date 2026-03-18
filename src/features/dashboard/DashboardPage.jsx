import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../hooks/useAppData";
import { financeService, scheduleService, employeesService, productsService, remindersService } from "../../services";
import { resolveOperationalDate, resolveOperationalMonth } from "../../utils/operationsDate";

export function DashboardPage() {
  const { db } = useAppData();

  const operatingDate = resolveOperationalDate(db);
  const month = resolveOperationalMonth(db, operatingDate);

  const dailyFinance = financeService.getDailyFinanceSummary(db, operatingDate);
  const monthlyFinance = financeService.getMonthlyFinanceSummary(db, month);
  const scheduleStats = scheduleService.getScheduleQuickStats(db);
  const employeeStats = employeesService.getEmployeesQuickStats(db);
  const lowStockProducts = productsService.listLowStockProducts(db);
  const reminders = remindersService.listReminders(db).filter((item) => item.status === "queued").slice(0, 4);

  const completedLogsInMonth = db.visitLogs.filter((log) => {
    const visit = db.scheduledVisits.find((item) => item.id === log.scheduled_visit_id);
    return log.status === "completed" && visit?.date.startsWith(month);
  });

  const averageTimePerHouse = completedLogsInMonth.length
    ? Math.round(
        completedLogsInMonth.reduce((total, log) => total + (log.actual_duration_min ?? 0), 0) /
          completedLogsInMonth.length
      )
    : 0;

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Monthly Revenue" value={`$${monthlyFinance.revenue.toFixed(2)}`} hint={`${month}`} />
        <StatCard label="Houses Completed" value={monthlyFinance.completedHouses} hint="Month to date" />
        <StatCard label="Avg Time Per House" value={`${averageTimePerHouse} min`} hint="Completed visits" />
        <StatCard label="Estimated Profit" value={`$${monthlyFinance.profit.toFixed(2)}`} hint="Revenue - costs" />
      </section>

      <section className="split-grid">
        <Card title="Today at a glance" subtitle={`Operating date: ${operatingDate}`}>
          <div className="metric-list">
            <div>
              <strong>{dailyFinance.completedHouses}</strong>
              <span>Completed houses</span>
            </div>
            <div>
              <strong>${dailyFinance.revenue.toFixed(2)}</strong>
              <span>Revenue</span>
            </div>
            <div>
              <strong>${dailyFinance.totalCosts.toFixed(2)}</strong>
              <span>Total costs</span>
            </div>
            <div>
              <strong>${dailyFinance.profit.toFixed(2)}</strong>
              <span>Profit</span>
            </div>
          </div>
        </Card>

        <Card title="Schedule execution">
          <div className="metric-list">
            <div>
              <strong>{scheduleStats.total}</strong>
              <span>Total visits</span>
            </div>
            <div>
              <strong>{scheduleStats.completed}</strong>
              <span>Completed</span>
            </div>
            <div>
              <strong>{scheduleStats.inProgress}</strong>
              <span>In progress</span>
            </div>
            <div>
              <strong>{scheduleStats.scheduled}</strong>
              <span>Scheduled</span>
            </div>
          </div>
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Operational reminders queue" subtitle="Reminder email architecture foundation">
          {reminders.length ? (
            <div className="stack-list">
              {reminders.map((reminder) => (
                <article key={reminder.id} className="row-item">
                  <div>
                    <strong>{reminder.client_name}</strong>
                    <p>{reminder.payload?.message}</p>
                  </div>
                  <Badge value={reminder.status} tone="warning" />
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No queued reminders.</p>
          )}
        </Card>

        <Card title="Team productivity basics">
          <div className="metric-list">
            <div>
              <strong>{employeeStats.active}</strong>
              <span>Active employees</span>
            </div>
            <div>
              <strong>{employeeStats.housesCompleted}</strong>
              <span>Houses completed</span>
            </div>
            <div>
              <strong>{employeeStats.hoursWorked}</strong>
              <span>Hours worked</span>
            </div>
            <div>
              <strong>{lowStockProducts.length}</strong>
              <span>Low stock products</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

