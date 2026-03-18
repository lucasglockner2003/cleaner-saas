import { summarizeFinanceByDate, summarizeFinanceByMonth } from "../../utils/financeCalculations";
import { sumBy } from "../helpers";

function mapVisitForFinance(visit) {
  return {
    date: visit.date,
    status: visit.status,
    price: visit.price
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

