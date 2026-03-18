import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { useAppData } from "../../hooks/useAppData";
import { FeedbackBanner } from "../ui/FeedbackBanner";
import { SyncStatusBanner } from "../ui/SyncStatusBanner";

export function AppShell({ children }) {
  const { lastFeedback, actions, isBootstrapping, persistence, mutationState } = useAppData();
  const isMutating = Object.values(mutationState || {}).some(Boolean);

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
        {isMutating ? <div className="mutation-indicator">Saving changes...</div> : null}
        <FeedbackBanner feedback={lastFeedback} onDismiss={actions.clearFeedback} />
        <SyncStatusBanner persistence={persistence} onRetry={actions.retryPendingSync} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
