import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./guards/ProtectedRoute";
import { ROLES } from "../auth/roles";

const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ClientsPage = lazy(() => import("../features/clients/ClientsPage").then((m) => ({ default: m.ClientsPage })));
const ClientDetailsPage = lazy(() =>
  import("../features/clients/ClientDetailsPage").then((m) => ({ default: m.ClientDetailsPage }))
);
const SchedulePage = lazy(() => import("../features/schedule/SchedulePage").then((m) => ({ default: m.SchedulePage })));
const TeamsPage = lazy(() => import("../features/teams/TeamsPage").then((m) => ({ default: m.TeamsPage })));
const EmployeesPage = lazy(() => import("../features/employees/EmployeesPage").then((m) => ({ default: m.EmployeesPage })));
const FinancePage = lazy(() => import("../features/finance/FinancePage").then((m) => ({ default: m.FinancePage })));
const ProductsPage = lazy(() => import("../features/products/ProductsPage").then((m) => ({ default: m.ProductsPage })));
const VisitsPage = lazy(() => import("../features/visits/VisitsPage").then((m) => ({ default: m.VisitsPage })));
const MonetizationPage = lazy(() =>
  import("../features/monetization/MonetizationPage").then((m) => ({ default: m.MonetizationPage }))
);
const CrmPage = lazy(() => import("../features/crm/CrmPage").then((m) => ({ default: m.CrmPage })));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const CommunicationsPage = lazy(() =>
  import("../features/communications/CommunicationsPage").then((m) => ({ default: m.CommunicationsPage }))
);
const BookingsPage = lazy(() => import("../features/bookings/BookingsPage").then((m) => ({ default: m.BookingsPage })));
const RecurringPage = lazy(() => import("../features/recurring/RecurringPage").then((m) => ({ default: m.RecurringPage })));
const LoginPage = lazy(() => import("../features/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const PortalLoginPage = lazy(() => import("../features/portal/PortalLoginPage").then((m) => ({ default: m.PortalLoginPage })));
const PortalHomePage = lazy(() => import("../features/portal/PortalHomePage").then((m) => ({ default: m.PortalHomePage })));
const PortalHistoryPage = lazy(() =>
  import("../features/portal/PortalHistoryPage").then((m) => ({ default: m.PortalHistoryPage }))
);
const PortalInvoicesPage = lazy(() =>
  import("../features/portal/PortalInvoicesPage").then((m) => ({ default: m.PortalInvoicesPage }))
);
const PortalBookingPage = lazy(() =>
  import("../features/portal/PortalBookingPage").then((m) => ({ default: m.PortalBookingPage }))
);
const PortalRecurringPage = lazy(() =>
  import("../features/portal/PortalRecurringPage").then((m) => ({ default: m.PortalRecurringPage }))
);
const PortalAccountPage = lazy(() =>
  import("../features/portal/PortalAccountPage").then((m) => ({ default: m.PortalAccountPage }))
);

function RouteFallback() {
  return (
    <div className="loading-screen">
      <p>Loading module...</p>
    </div>
  );
}

function withLazyBoundary(element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={withLazyBoundary(<LoginPage />)} />
      <Route path="/portal/login" element={withLazyBoundary(<PortalLoginPage />)} />
      <Route
        path="/"
        element={
          <ProtectedRoute allowedUserTypes={["internal"]}>
            {withLazyBoundary(<DashboardPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<ClientsPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:clientId"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<ClientDetailsPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute allowedUserTypes={["internal"]}>
            {withLazyBoundary(<SchedulePage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<TeamsPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<EmployeesPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<FinancePage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<ProductsPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/visits"
        element={
          <ProtectedRoute allowedUserTypes={["internal"]}>
            {withLazyBoundary(<VisitsPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/monetization"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<MonetizationPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<CrmPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/communications"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<CommunicationsPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<BookingsPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/recurring"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.OPS]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<RecurringPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER]} allowedUserTypes={["internal"]}>
            {withLazyBoundary(<SettingsPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            {withLazyBoundary(<PortalHomePage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/history"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            {withLazyBoundary(<PortalHistoryPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/invoices"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            {withLazyBoundary(<PortalInvoicesPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/booking"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            {withLazyBoundary(<PortalBookingPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/recurring"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            {withLazyBoundary(<PortalRecurringPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/account"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} allowedUserTypes={["customer"]}>
            {withLazyBoundary(<PortalAccountPage />)}
          </ProtectedRoute>
        }
      />
      <Route path="/portal/*" element={<Navigate to="/portal" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
