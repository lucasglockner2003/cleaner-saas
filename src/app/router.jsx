import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ClientsPage } from "../features/clients/ClientsPage";
import { ClientDetailsPage } from "../features/clients/ClientDetailsPage";
import { SchedulePage } from "../features/schedule/SchedulePage";
import { TeamsPage } from "../features/teams/TeamsPage";
import { EmployeesPage } from "../features/employees/EmployeesPage";
import { FinancePage } from "../features/finance/FinancePage";
import { ProductsPage } from "../features/products/ProductsPage";
import { VisitsPage } from "../features/visits/VisitsPage";
import { SettingsPage } from "../features/settings/SettingsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/clients" element={<ClientsPage />} />
      <Route path="/clients/:clientId" element={<ClientDetailsPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="/finance" element={<FinancePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/visits" element={<VisitsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

