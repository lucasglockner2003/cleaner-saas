import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAppData } from "../../hooks/useAppData";
import {
  bookingsService,
  communicationJobsService,
  completionService,
  crmService,
  employeesService,
  financeService,
  growthService,
  invoicesService,
  paymentsService,
  photoStorageService,
  productsService,
  recurringScheduleService,
  remindersService,
  scheduleService,
  subscriptionsService,
  visitsService
} from "../../services";
import { resolveOperationalDate, resolveOperationalMonth } from "../../utils/operationsDate";

function trendTone(value) {
  if (value > 0) return "success";
  if (value < 0) return "danger";
  return "muted";
}

export function DashboardPage() {
  const { db } = useAppData();

  const operatingDate = resolveOperationalDate(db);
  const month = resolveOperationalMonth(db, operatingDate);

  const dailyFinance = financeService.getDailyFinanceSummary(db, operatingDate);
  const monthlyFinance = financeService.getMonthlyFinanceSummary(db, month);
  const financeInsights = financeService.getOperationalFinanceInsights(db, month);
  const areaInsights = financeService.getAreaProfitabilityInsights(db, month);
  const paymentsSummary = paymentsService.getPaymentsSummary(db, { month });
  const subscriptionSummary = subscriptionsService.getSubscriptionRevenueSummary(db);
  const lifecycleSummary = crmService.getLifecycleSummary(db);
  const growthSummary = growthService.getGrowthSummary(db);
  const trend = financeService.getMonthlyTrend(db, month);
  const scheduleStats = scheduleService.getScheduleQuickStats(db);
  const scheduleOptimization = scheduleService.getWeeklyOptimizationSignals(db);
  const employeeStats = employeesService.getEmployeesQuickStats(db);
  const productInsights = productsService.getInventoryInsights(db);
  const reminderStats = remindersService.getReminderStats(db);
  const invoiceStats = invoicesService.getInvoiceStats(db);
  const completionStats = completionService.getCompletionCommunicationStats(db);
  const jobStats = communicationJobsService.getCommunicationJobStatsByType(db);
  const proofStats = photoStorageService.getProofCompletenessStats(db);
  const bookingSummary = bookingsService.getBookingPipelineSummary(db);
  const recurringOverview = recurringScheduleService.getRecurringOperationalOverview(db, {
    fromDate: operatingDate,
    horizonDays: 60
  });
  const visitSummary = visitsService.getVisitPerformanceSummary(db);
  const week = scheduleService.getWeeklySchedule(db);

  const averageTimePerHouse = db.visitLogs.filter((log) => log.status === "completed").length
    ? Math.round(
        db.visitLogs.filter((log) => log.status === "completed").reduce((total, log) => total + (log.actual_duration_min ?? 0), 0) /
          db.visitLogs.filter((log) => log.status === "completed").length
      )
    : 0;

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Monthly Revenue" value={`$${monthlyFinance.revenue.toFixed(2)}`} hint={`${month}`} />
        <StatCard label="Houses Completed" value={monthlyFinance.completedHouses} hint="Month to date" />
        <StatCard label="Avg Time Per House" value={`${averageTimePerHouse} min`} hint="Completed visits" />
        <StatCard
          label="Estimated Profit"
          value={`$${monthlyFinance.adjustedProfit.toFixed(2)}`}
          hint="Revenue - costs - travel estimate"
        />
      </section>

      <section className="stat-grid">
        <StatCard label="MRR" value={`$${subscriptionSummary.mrr.toFixed(2)}`} hint={`${subscriptionSummary.activeSubscriptions} active subscriptions`} />
        <StatCard label="Collection Rate" value={`${paymentsSummary.collectionRate}%`} hint="Invoices converted to paid" />
        <StatCard label="At-Risk Clients" value={lifecycleSummary.atRiskClients} hint="CRM retention signal" />
        <StatCard label="Referral Conversions" value={growthSummary.referrals.converted} hint="Growth pipeline performance" />
      </section>

      <section className="split-grid">
        <Card title="Operational health" subtitle={`Operating date: ${operatingDate}`}>
          <div className="metric-list">
            <div>
              <strong>{scheduleStats.inProgress}</strong>
              <span>Houses in progress</span>
            </div>
            <div>
              <strong>{visitSummary.lateStarts}</strong>
              <span>Late starts</span>
            </div>
            <div>
              <strong>{visitSummary.overrun}</strong>
              <span>Overrun visits</span>
            </div>
            <div>
              <strong>{productInsights.totals.low + productInsights.totals.out}</strong>
              <span>Inventory risk items</span>
            </div>
            <div>
              <strong>{scheduleOptimization.overloadedTeams}</strong>
              <span>Overloaded team-days</span>
            </div>
            <div>
              <strong>{scheduleOptimization.underutilizedTeams}</strong>
              <span>Underutilized team-days</span>
            </div>
            <div>
              <strong>{Math.round(scheduleOptimization.averageGeocodeCoveragePct * 100)}%</strong>
              <span>Geocode readiness</span>
            </div>
          </div>
        </Card>

        <Card title="Today financial pulse">
          <div className="metric-list">
            <div>
              <strong>${dailyFinance.revenue.toFixed(2)}</strong>
              <span>Revenue</span>
            </div>
            <div>
              <strong>${dailyFinance.totalCosts.toFixed(2)}</strong>
              <span>Costs</span>
            </div>
            <div>
              <strong>${dailyFinance.adjustedProfit.toFixed(2)}</strong>
              <span>Adjusted profit</span>
            </div>
            <div>
              <strong>{dailyFinance.completedHouses}</strong>
              <span>Completed houses</span>
            </div>
            <div>
              <strong>${dailyFinance.estimatedTravelCost.toFixed(2)}</strong>
              <span>Estimated travel cost</span>
            </div>
          </div>
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Monetization and billing">
          <div className="detail-list">
            <p>
              <span>Captured payments</span>
              <strong>${paymentsSummary.capturedAmount.toFixed(2)}</strong>
            </p>
            <p>
              <span>Pending payments</span>
              <strong>${paymentsSummary.pendingAmount.toFixed(2)}</strong>
            </p>
            <p>
              <span>Outstanding balance</span>
              <strong>${paymentsSummary.balanceDue.toFixed(2)}</strong>
            </p>
            <p>
              <span>ARR projection</span>
              <strong>${subscriptionSummary.arr.toFixed(2)}</strong>
            </p>
          </div>
        </Card>

        <Card title="Lifecycle and growth">
          <div className="detail-list">
            <p>
              <span>Leads</span>
              <strong>{lifecycleSummary.leads}</strong>
            </p>
            <p>
              <span>Reactivation targets</span>
              <strong>{lifecycleSummary.reactivationTargets}</strong>
            </p>
            <p>
              <span>Active campaigns</span>
              <strong>{growthSummary.campaigns.active}</strong>
            </p>
            <p>
              <span>Campaign conversion rate</span>
              <strong>{growthSummary.campaigns.conversionRate}%</strong>
            </p>
          </div>
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Route optimization and dispatch load">
          <div className="detail-list">
            <p>
              <span>Route distance (week)</span>
              <strong>{scheduleOptimization.routeDistanceKm.toFixed(1)} km</strong>
            </p>
            <p>
              <span>Travel time (week)</span>
              <strong>{scheduleOptimization.routeTravelMin} min</strong>
            </p>
            <p>
              <span>Potential travel savings</span>
              <strong>{scheduleOptimization.potentialTravelMinSaved} min</strong>
            </p>
            <p>
              <span>Potential km savings</span>
              <strong>{scheduleOptimization.potentialDistanceKmSaved.toFixed(1)} km</strong>
            </p>
            <p>
              <span>Top optimization day</span>
              <strong>
                {scheduleOptimization.topOpportunity
                  ? `${scheduleOptimization.topOpportunity.day_name} ${scheduleOptimization.topOpportunity.team_name}`
                  : "-"}
              </strong>
            </p>
          </div>
        </Card>

        <Card title="Geographic profitability signals">
          <div className="detail-list">
            <p>
              <span>Area revenue total</span>
              <strong>${areaInsights.summary.totalRevenue.toFixed(2)}</strong>
            </p>
            <p>
              <span>Area profit total</span>
              <strong>${areaInsights.summary.totalProfit.toFixed(2)}</strong>
            </p>
            <p>
              <span>Travel cost by area</span>
              <strong>${areaInsights.summary.totalTravelCost.toFixed(2)}</strong>
            </p>
            <p>
              <span>At-risk suburbs</span>
              <strong>{areaInsights.rows.filter((row) => row.signal === "at_risk").length}</strong>
            </p>
          </div>
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Dispatch board snapshot">
          {week.length ? (
            <div className="stack-list">
              {week.map((day) => (
                <article key={`${day.day_name}-${day.date}`} className="row-item">
                  <div>
                    <strong>
                      {day.day_name} - {day.team_name}
                    </strong>
                    <p className="muted">
                      {day.daySummary?.completed ?? 0}/{day.daySummary?.total ?? 0} completed | Overruns {day.daySummary?.overrunCount ?? 0}
                    </p>
                    <p className="muted">
                      Route {(day.daySummary?.routeDistanceKm ?? 0).toFixed(1)} km | Save {day.daySummary?.routeTravelMinSaved ?? 0}m | Load{" "}
                      {day.loadSignal?.signal ?? "balanced"}
                    </p>
                  </div>
                  <Badge value={day.estimation?.projectedEnd ?? "-"} tone="neutral" />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No schedule loaded" message="Schedule snapshots will appear here." />
          )}
        </Card>

        <Card title="Reminder queue and workforce">
          <div className="detail-list">
            <p>
              <span>Queued reminders</span>
              <strong>{reminderStats.queued}</strong>
            </p>
            <p>
              <span>Retry reminders</span>
              <strong>{reminderStats.retry_scheduled}</strong>
            </p>
            <p>
              <span>Invoice queued</span>
              <strong>{invoiceStats.issued}</strong>
            </p>
            <p>
              <span>Completion failed</span>
              <strong>{completionStats.failed}</strong>
            </p>
            <p>
              <span>Active employees</span>
              <strong>{employeeStats.active}</strong>
            </p>
          </div>
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Communication pipeline health">
          <div className="detail-list">
            <p>
              <span>Total jobs</span>
              <strong>{jobStats.overall.total}</strong>
            </p>
            <p>
              <span>Queued jobs</span>
              <strong>{jobStats.overall.queued}</strong>
            </p>
            <p>
              <span>Retry scheduled</span>
              <strong>{jobStats.overall.retry_scheduled}</strong>
            </p>
            <p>
              <span>Failed jobs</span>
              <strong>{jobStats.overall.failed}</strong>
            </p>
            <p>
              <span>Sent jobs</span>
              <strong>{jobStats.overall.sent}</strong>
            </p>
          </div>
        </Card>

        <Card title="Proof and completion readiness">
          <div className="detail-list">
            <p>
              <span>Completed visits</span>
              <strong>{completionStats.total}</strong>
            </p>
            <p>
              <span>Completion queued</span>
              <strong>{completionStats.queued + completionStats.retry_scheduled}</strong>
            </p>
            <p>
              <span>Completion sent</span>
              <strong>{completionStats.sent}</strong>
            </p>
            <p>
              <span>Proof required</span>
              <strong>{proofStats.proofRequiredVisits}</strong>
            </p>
            <p>
              <span>Proof missing</span>
              <strong>{proofStats.proofMissingRequiredVisits}</strong>
            </p>
          </div>
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Customer demand and recurring planning">
          <div className="detail-list">
            <p>
              <span>New booking requests</span>
              <strong>{bookingSummary.new}</strong>
            </p>
            <p>
              <span>Requests under review</span>
              <strong>{bookingSummary.reviewing}</strong>
            </p>
            <p>
              <span>Approved requests</span>
              <strong>{bookingSummary.approved}</strong>
            </p>
            <p>
              <span>Active recurring rules</span>
              <strong>{recurringOverview.summary.active}</strong>
            </p>
            <p>
              <span>Projected recurring visits</span>
              <strong>{recurringOverview.projected.filter((item) => item.status === "projected").length}</strong>
            </p>
          </div>
        </Card>

        <Card title="Upcoming recurring pipeline">
          {recurringOverview.projected.length ? (
            <div className="stack-list">
              {recurringOverview.projected.slice(0, 6).map((item) => (
                <article key={`${item.recurrence_id}-${item.date}`} className="row-item">
                  <div>
                    <strong>
                      {item.client_name} - {item.service_type_name}
                    </strong>
                    <p className="muted">
                      {item.date} {item.window_start} - {item.window_end}
                    </p>
                  </div>
                  <Badge value={item.status} tone={item.status === "already_scheduled" ? "success" : "neutral"} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No recurring projections" message="Active recurring rules will generate future projections." />
          )}
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Profit trend (month)">
          {trend.length ? (
            <div className="stack-list">
              {trend.map((day) => (
                <article key={day.date} className="row-item">
                  <div>
                    <strong>{day.date}</strong>
                    <p className="muted">
                      Revenue ${day.revenue.toFixed(2)} | Costs ${day.costs.toFixed(2)}
                    </p>
                  </div>
                  <Badge value={`$${day.profit.toFixed(2)}`} tone={trendTone(day.profit)} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No trend data" message="Visit and expense data will populate monthly trend." />
          )}
        </Card>

        <Card title="Top suburbs and team performance">
          <h4>Suburbs by revenue</h4>
          {financeInsights.bySuburb.length ? (
            <ul className="simple-list">
              {financeInsights.bySuburb.slice(0, 4).map((suburb) => (
                <li key={suburb.suburb}>
                  <strong>{suburb.suburb}</strong> - ${suburb.revenue.toFixed(2)} revenue | ${suburb.profit.toFixed(2)} profit
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No suburb insights yet.</p>
          )}

          <hr className="divider" />
          <h4>Team profitability</h4>
          {financeInsights.byTeam.length ? (
            <ul className="simple-list">
              {financeInsights.byTeam.map((team) => (
                <li key={team.team_id}>
                  <strong>{team.team_name}</strong> - ${team.profit.toFixed(2)} profit
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No team insights yet.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
