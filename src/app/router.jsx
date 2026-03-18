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
import { CommunicationsPage } from "../features/communications/CommunicationsPage";
import { BookingsPage } from "../features/bookings/BookingsPage";
import { RecurringPage } from "../features/recurring/RecurringPage";
import { LoginPage } from "../features/auth/LoginPage";
import { PortalLoginPage } from "../features/portal/PortalLoginPage";
import { PortalHomePage } from "../features/portal/PortalHomePage";
import { PortalHistoryPage } from "../features/portal/PortalHistoryPage";
import { PortalInvoicesPage } from "../features/portal/PortalInvoicesPage";
import { PortalBookingPage } from "../features/portal/PortalBookingPage";
import { PortalRecurringPage } from "../features/portal/PortalRecurringPage";
import { PortalAccountPage } from "../features/portal/PortalAccountPage";
import { ProtectedRoute } from "./guards/ProtectedRoute";
import { ROLES } from "../auth/roles";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/portal/login" element={<PortalLoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute allowedUserTypes={["internal"]}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            <ClientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:clientId"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            <ClientDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute allowedUserTypes={["internal"]}>
            <SchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            <TeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            <FinancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/visits"
        element={
          <ProtectedRoute allowedUserTypes={["internal"]}>
            <VisitsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/communications"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            <CommunicationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            <BookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recurring"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            <RecurringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER]} allowedUserTypes={["internal"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            <PortalHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/history"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            <PortalHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/invoices"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            <PortalInvoicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/booking"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            <PortalBookingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/recurring"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            <PortalRecurringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/account"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            <PortalAccountPage />
          </ProtectedRoute>
        }
      />
      <Route path="/portal/*" element={<Navigate to="/portal" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
