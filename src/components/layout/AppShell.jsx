import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { useAppData } from "../../hooks/useAppData";
import { FeedbackBanner } from "../ui/FeedbackBanner";
import { SyncStatusBanner } from "../ui/SyncStatusBanner";
import { ConfigStatusBanner } from "../ui/ConfigStatusBanner";
import { getRuntimeConfigReport } from "../../config/env";

function humanizeMutationKey(key) {
  return String(key || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase())
    .trim();
}

export function AppShell({ children }) {
  const { lastFeedback, actions, isBootstrapping, persistence, mutationState } = useAppData();
  const pendingActions = Object.entries(mutationState || {})
    .filter(([, pending]) => Boolean(pending))
    .map(([key]) => humanizeMutationKey(key));
  const isMutating = pendingActions.length > 0;
  const configReport = getRuntimeConfigReport();

  if (isBootstrapping) {
    return (
      <div className="loading-screen">
        <p>Loading operational data...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopHeader />
        {isMutating ? (
          <div className="mutation-indicator">
            <strong>{pendingActions.length} operation(s) in progress.</strong>
            <span>{pendingActions.slice(0, 4).join(", ")}{pendingActions.length > 4 ? "..." : ""}</span>
          </div>
        ) : null}
        <FeedbackBanner feedback={lastFeedback} onDismiss={actions.clearFeedback} />
        <ConfigStatusBanner report={configReport} />
        <SyncStatusBanner persistence={persistence} onRetry={actions.retryPendingSync} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
