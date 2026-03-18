import { summarizeFinanceByDate, summarizeFinanceByMonth } from "../../utils/financeCalculations";
import { sumBy } from "../helpers";

function mapVisitForFinance(visit) {
  return {
    id: visit.id,
    client_id: visit.client_id,
    team_id: visit.team_id,
    date: visit.date,
    status: visit.status,
    price: visit.price,
    estimated_duration_min: visit.estimated_duration_min
  };
}

export function getDailyFinanceSummary(db, date) {
  return summarizeFinanceByDate({
    date,
    visits: db.scheduledVisits.map(mapVisitForFinance),
    expenses: db.expenses
  });
}

export function getMonthlyFinanceSummary(db, month) {
  return summarizeFinanceByMonth({
    month,
    visits: db.scheduledVisits.map(mapVisitForFinance),
    expenses: db.expenses
  });
}

export function getMonthlyFinanceBreakdown(db, month) {
  const monthExpenses = db.expenses.filter((expense) => expense.date.startsWith(month));
  const categories = ["gas", "products", "wages"];
  const byCategory = categories.map((category) => ({
    category,
    amount: sumBy(
      monthExpenses.filter((expense) => expense.category === category),
      (expense) => expense.amount
    )
  }));

  return byCategory;
}

export function getDailyVisitFinanceRows(db, date) {
  const rows = db.scheduledVisits
    .filter((visit) => visit.date === date)
    .map((visit) => {
      const client = db.clients.find((item) => item.id === visit.client_id);
      const team = db.teams.find((item) => item.id === visit.team_id);
      const visitExpenses = db.expenses.filter((expense) => expense.visit_id === visit.id);
      const sharedTeamExpenses = db.expenses.filter(
        (expense) => expense.date === date && expense.team_id === visit.team_id && expense.visit_id == null
      );

      const directCosts = visitExpenses.reduce((total, expense) => total + expense.amount, 0);
      const sharedPerVisit = sharedTeamExpenses.length
        ? sharedTeamExpenses.reduce((total, expense) => total + expense.amount, 0) /
          Math.max(
            1,
            db.scheduledVisits.filter((item) => item.date === date && item.team_id === visit.team_id).length
          )
        : 0;
      const estimatedCost = directCosts + sharedPerVisit;
      const profit = (visit.price ?? 0) - estimatedCost;

      return {
        id: visit.id,
        client_name: client?.full_name ?? "-",
        team_name: team?.name ?? "-",
        suburb: client?.suburb ?? "-",
        status: visit.status,
        revenue: visit.price ?? 0,
        estimatedCost,
        profit,
        marginPct: visit.price ? Number(((profit / visit.price) * 100).toFixed(1)) : 0
      };
    })
    .sort((a, b) => b.profit - a.profit);

  return rows;
}

export function getMonthlyTrend(db, month) {
  const days = [...new Set(db.scheduledVisits.filter((visit) => visit.date.startsWith(month)).map((visit) => visit.date))].sort();

  return days.map((date) => {
    const daily = getDailyFinanceSummary(db, date);
    return {
      date,
      revenue: daily.revenue,
      costs: daily.totalCosts,
      profit: daily.profit
    };
  });
}

export function getOperationalFinanceInsights(db, month) {
  const monthVisits = db.scheduledVisits.filter((visit) => visit.date.startsWith(month) && visit.status === "completed");
  const monthExpenses = db.expenses.filter((expense) => expense.date.startsWith(month));

  const byTeam = db.teams.map((team) => {
    const visits = monthVisits.filter((visit) => visit.team_id === team.id);
    const revenue = sumBy(visits, (visit) => visit.price ?? 0);
    const teamCosts = sumBy(
      monthExpenses.filter((expense) => expense.team_id === team.id),
      (expense) => expense.amount
    );
    const profit = revenue - teamCosts;

    return {
      team_id: team.id,
      team_name: team.name,
      visits: visits.length,
      revenue,
      costs: teamCosts,
      profit
    };
  });

  const suburbMap = {};
  monthVisits.forEach((visit) => {
    const client = db.clients.find((item) => item.id === visit.client_id);
    const suburb = client?.suburb ?? "Unknown";
    const bucket = suburbMap[suburb] ?? {
      suburb,
      visits: 0,
      revenue: 0
    };
    bucket.visits += 1;
    bucket.revenue += visit.price ?? 0;
    suburbMap[suburb] = bucket;
  });

  const bySuburb = Object.values(suburbMap).sort((a, b) => b.revenue - a.revenue);
  const bestProfitDay =
    getMonthlyTrend(db, month).sort((a, b) => b.profit - a.profit)[0] ?? null;

  return {
    byTeam,
    bySuburb,
    bestProfitDay
  };
}
