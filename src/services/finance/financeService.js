import { summarizeFinanceByDate, summarizeFinanceByMonth } from "../../utils/financeCalculations";
import { sumBy } from "../helpers";
import { buildRoutePlan } from "../routes/routeOptimizationService";

const DEFAULT_TRAVEL_COST_PER_KM = 0.62;

function normalizeCurrency(value) {
  return Number(Number(value || 0).toFixed(2));
}

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

function estimateTravelCostsByVisit(db, filters = {}, options = {}) {
  const { date = null, month = null, strategy = "current" } = filters;
  const costPerKm = options.costPerKm ?? DEFAULT_TRAVEL_COST_PER_KM;
  const travelCostByVisit = {};
  const travelKmByVisit = {};

  const relevantScheduleDays = db.scheduleDays.filter((day) => {
    if (date && day.date !== date) {
      return false;
    }

    if (month && !day.date.startsWith(month)) {
      return false;
    }

    return true;
  });

  relevantScheduleDays.forEach((scheduleDay) => {
    const visits = db.scheduledVisits
      .filter((visit) => visit.schedule_day_id === scheduleDay.id && visit.status !== "cancelled")
      .sort((a, b) => a.order_index - b.order_index);

    if (!visits.length) {
      return;
    }

    const routePlan = buildRoutePlan({
      db,
      scheduleDay,
      visits
    });

    const legs = strategy === "recommended" ? routePlan.recommended.legs : routePlan.current.legs;
    legs.forEach((leg) => {
      const distanceKm = leg.distance_km ?? 0;
      travelKmByVisit[leg.visit_id] = normalizeCurrency((travelKmByVisit[leg.visit_id] ?? 0) + distanceKm);
      travelCostByVisit[leg.visit_id] = normalizeCurrency(
        (travelCostByVisit[leg.visit_id] ?? 0) + distanceKm * costPerKm
      );
    });
  });

  return {
    travelCostByVisit,
    travelKmByVisit,
    totalTravelKm: normalizeCurrency(Object.values(travelKmByVisit).reduce((total, value) => total + value, 0)),
    totalTravelCost: normalizeCurrency(Object.values(travelCostByVisit).reduce((total, value) => total + value, 0)),
    costPerKm
  };
}

function calculateVisitBaselineCost(db, visit) {
  const visitExpenses = db.expenses.filter((expense) => expense.visit_id === visit.id);
  const sharedTeamExpenses = db.expenses.filter(
    (expense) => expense.date === visit.date && expense.team_id === visit.team_id && expense.visit_id == null
  );
  const teamVisitCount = Math.max(
    1,
    db.scheduledVisits.filter((item) => item.date === visit.date && item.team_id === visit.team_id).length
  );

  const directCosts = visitExpenses.reduce((total, expense) => total + expense.amount, 0);
  const sharedPerVisit = sharedTeamExpenses.length
    ? sharedTeamExpenses.reduce((total, expense) => total + expense.amount, 0) / teamVisitCount
    : 0;

  return {
    directCosts: normalizeCurrency(directCosts),
    sharedPerVisit: normalizeCurrency(sharedPerVisit),
    estimatedCost: normalizeCurrency(directCosts + sharedPerVisit)
  };
}

export function getDailyFinanceSummary(db, date) {
  const summary = summarizeFinanceByDate({
    date,
    visits: db.scheduledVisits.map(mapVisitForFinance),
    expenses: db.expenses
  });
  const travel = estimateTravelCostsByVisit(db, { date });
  const adjustedProfit = summary.profit - travel.totalTravelCost;

  return {
    ...summary,
    estimatedTravelCost: travel.totalTravelCost,
    adjustedProfit: normalizeCurrency(adjustedProfit),
    travelCostPerKm: travel.costPerKm
  };
}

export function getMonthlyFinanceSummary(db, month) {
  const summary = summarizeFinanceByMonth({
    month,
    visits: db.scheduledVisits.map(mapVisitForFinance),
    expenses: db.expenses
  });
  const travel = estimateTravelCostsByVisit(db, { month });

  return {
    ...summary,
    estimatedTravelCost: travel.totalTravelCost,
    adjustedProfit: normalizeCurrency(summary.profit - travel.totalTravelCost),
    travelCostPerKm: travel.costPerKm
  };
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
  const travel = estimateTravelCostsByVisit(db, { month });
  byCategory.push({
    category: "travel_estimated",
    amount: travel.totalTravelCost
  });

  return byCategory;
}

export function getDailyVisitFinanceRows(db, date) {
  const travel = estimateTravelCostsByVisit(db, { date });
  const rows = db.scheduledVisits
    .filter((visit) => visit.date === date)
    .map((visit) => {
      const client = db.clients.find((item) => item.id === visit.client_id);
      const team = db.teams.find((item) => item.id === visit.team_id);
      const baselineCost = calculateVisitBaselineCost(db, visit);
      const travelCost = travel.travelCostByVisit[visit.id] ?? 0;
      const travelKm = travel.travelKmByVisit[visit.id] ?? 0;
      const totalEstimatedCost = normalizeCurrency(baselineCost.estimatedCost + travelCost);
      const profit = normalizeCurrency((visit.price ?? 0) - totalEstimatedCost);

      return {
        id: visit.id,
        client_name: client?.full_name ?? "-",
        team_name: team?.name ?? "-",
        suburb: client?.suburb ?? "-",
        status: visit.status,
        revenue: visit.price ?? 0,
        directCosts: baselineCost.directCosts,
        sharedCosts: baselineCost.sharedPerVisit,
        travelCost: normalizeCurrency(travelCost),
        travelKm: normalizeCurrency(travelKm),
        estimatedCost: totalEstimatedCost,
        profit,
        marginPct: visit.price ? Number(((profit / visit.price) * 100).toFixed(1)) : 0
      };
    })
    .sort((a, b) => b.profit - a.profit);

  return rows;
}

export function getMonthlyTrend(db, month) {
  const days = [
    ...new Set(db.scheduledVisits.filter((visit) => visit.date.startsWith(month)).map((visit) => visit.date))
  ].sort();

  return days.map((date) => {
    const daily = getDailyFinanceSummary(db, date);
    return {
      date,
      revenue: daily.revenue,
      costs: normalizeCurrency(daily.totalCosts + daily.estimatedTravelCost),
      travelCost: daily.estimatedTravelCost,
      profit: daily.adjustedProfit,
      baseProfit: daily.profit
    };
  });
}

export function getAreaProfitabilityInsights(db, month, options = {}) {
  const travel = estimateTravelCostsByVisit(db, { month }, options);
  const monthVisits = db.scheduledVisits.filter((visit) => visit.date.startsWith(month) && visit.status === "completed");
  const areaMap = {};

  monthVisits.forEach((visit) => {
    const client = db.clients.find((item) => item.id === visit.client_id);
    const suburb = client?.suburb ?? "Unknown";
    const bucket = areaMap[suburb] ?? {
      suburb,
      visits: 0,
      revenue: 0,
      baseline_cost: 0,
      travel_cost: 0,
      travel_km: 0
    };
    const baselineCost = calculateVisitBaselineCost(db, visit);
    const travelCost = travel.travelCostByVisit[visit.id] ?? 0;
    const travelKm = travel.travelKmByVisit[visit.id] ?? 0;

    bucket.visits += 1;
    bucket.revenue += visit.price ?? 0;
    bucket.baseline_cost += baselineCost.estimatedCost;
    bucket.travel_cost += travelCost;
    bucket.travel_km += travelKm;
    areaMap[suburb] = bucket;
  });

  const rows = Object.values(areaMap)
    .map((item) => {
      const totalCost = normalizeCurrency(item.baseline_cost + item.travel_cost);
      const profit = normalizeCurrency(item.revenue - totalCost);
      const marginPct = item.revenue > 0 ? Number(((profit / item.revenue) * 100).toFixed(1)) : 0;
      const signal = profit < 0 || marginPct < 12 ? "at_risk" : marginPct < 22 ? "watch" : "healthy";

      return {
        suburb: item.suburb,
        visits: item.visits,
        revenue: normalizeCurrency(item.revenue),
        baseline_cost: normalizeCurrency(item.baseline_cost),
        travel_cost: normalizeCurrency(item.travel_cost),
        total_cost: totalCost,
        profit,
        marginPct,
        avg_travel_km: item.visits ? normalizeCurrency(item.travel_km / item.visits) : 0,
        signal
      };
    })
    .sort((a, b) => b.profit - a.profit);

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalRevenue += row.revenue;
      acc.totalCost += row.total_cost;
      acc.totalTravelCost += row.travel_cost;
      acc.totalProfit += row.profit;
      return acc;
    },
    {
      totalRevenue: 0,
      totalCost: 0,
      totalTravelCost: 0,
      totalProfit: 0
    }
  );

  return {
    rows,
    summary: {
      totalRevenue: normalizeCurrency(summary.totalRevenue),
      totalCost: normalizeCurrency(summary.totalCost),
      totalTravelCost: normalizeCurrency(summary.totalTravelCost),
      totalProfit: normalizeCurrency(summary.totalProfit)
    },
    costPerKm: travel.costPerKm
  };
}

export function getOperationalFinanceInsights(db, month) {
  const monthVisits = db.scheduledVisits.filter((visit) => visit.date.startsWith(month) && visit.status === "completed");
  const monthExpenses = db.expenses.filter((expense) => expense.date.startsWith(month));
  const travel = estimateTravelCostsByVisit(db, { month });
  const area = getAreaProfitabilityInsights(db, month);

  const byTeam = db.teams.map((team) => {
    const visits = monthVisits.filter((visit) => visit.team_id === team.id);
    const revenue = sumBy(visits, (visit) => visit.price ?? 0);
    const baselineCosts = sumBy(
      monthExpenses.filter((expense) => expense.team_id === team.id),
      (expense) => expense.amount
    );
    const travelCost = sumBy(visits, (visit) => travel.travelCostByVisit[visit.id] ?? 0);
    const totalCosts = baselineCosts + travelCost;
    const profit = revenue - totalCosts;

    return {
      team_id: team.id,
      team_name: team.name,
      visits: visits.length,
      revenue: normalizeCurrency(revenue),
      costs: normalizeCurrency(totalCosts),
      baseline_costs: normalizeCurrency(baselineCosts),
      travel_cost: normalizeCurrency(travelCost),
      profit: normalizeCurrency(profit)
    };
  });

  const bySuburb = area.rows.map((row) => ({
    suburb: row.suburb,
    visits: row.visits,
    revenue: row.revenue,
    costs: row.total_cost,
    travel_cost: row.travel_cost,
    profit: row.profit,
    marginPct: row.marginPct,
    signal: row.signal
  }));
  const bestProfitDay = getMonthlyTrend(db, month).sort((a, b) => b.profit - a.profit)[0] ?? null;

  return {
    byTeam,
    bySuburb,
    bestProfitDay,
    areaSummary: area.summary
  };
}
