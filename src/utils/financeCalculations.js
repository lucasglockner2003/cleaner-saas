import { todayIsoDate } from "./dateTime";

export function summarizeFinanceByDate({ date = todayIsoDate(), visits = [], expenses = [] }) {
  const completedVisits = visits.filter((visit) => visit.date === date && visit.status === "completed");
  const revenue = completedVisits.reduce((total, visit) => total + (visit.price ?? 0), 0);

  const dayExpenses = expenses.filter((expense) => expense.date === date);
  const costByCategory = dayExpenses.reduce((acc, expense) => {
    const current = acc[expense.category] ?? 0;
    return {
      ...acc,
      [expense.category]: current + expense.amount
    };
  }, {});

  const totalCosts = dayExpenses.reduce((total, expense) => total + expense.amount, 0);
  const profit = revenue - totalCosts;

  return {
    date,
    completedHouses: completedVisits.length,
    revenue,
    totalCosts,
    profit,
    costByCategory
  };
}

export function summarizeFinanceByMonth({ month, visits = [], expenses = [] }) {
  const visitInMonth = visits.filter((visit) => visit.date.startsWith(month));
  const expenseInMonth = expenses.filter((expense) => expense.date.startsWith(month));

  const completedVisits = visitInMonth.filter((visit) => visit.status === "completed");
  const revenue = completedVisits.reduce((total, visit) => total + (visit.price ?? 0), 0);
  const totalCosts = expenseInMonth.reduce((total, expense) => total + expense.amount, 0);
  const profit = revenue - totalCosts;
  const averageRevenuePerHouse = completedVisits.length ? revenue / completedVisits.length : 0;

  return {
    month,
    completedHouses: completedVisits.length,
    revenue,
    totalCosts,
    profit,
    averageRevenuePerHouse
  };
}

