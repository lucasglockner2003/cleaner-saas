import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { usePortalSnapshot } from "./usePortalSnapshot";
import { formatDateTime } from "../../utils/dateTime";

export function PortalAccountPage() {
  const snapshot = usePortalSnapshot();
  if (!snapshot) {
    return (
      <Card title="Portal account not available">
        <p className="muted">Your portal account could not be linked to profile data.</p>
      </Card>
    );
  }

  return (
    <div className="page-grid">
      <Card title="Account profile" subtitle="Customer portal account and service profile details">
        <div className="detail-list">
          <p>
            <span>Portal account</span>
            <strong>{snapshot.account.id}</strong>
          </p>
          <p>
            <span>Status</span>
            <strong>
              <Badge value={snapshot.account.status} tone={snapshot.account.status === "active" ? "success" : "warning"} />
            </strong>
          </p>
          <p>
            <span>Full name</span>
            <strong>{snapshot.profile.full_name}</strong>
          </p>
          <p>
            <span>Email</span>
            <strong>{snapshot.profile.email}</strong>
          </p>
          <p>
            <span>Phone</span>
            <strong>{snapshot.profile.phone}</strong>
          </p>
          <p>
            <span>Address</span>
            <strong>{snapshot.profile.address}</strong>
          </p>
          <p>
            <span>Primary service</span>
            <strong>{snapshot.profile.service_type_name}</strong>
          </p>
          <p>
            <span>Frequency</span>
            <strong>{snapshot.profile.cleaning_frequency}</strong>
          </p>
          <p>
            <span>Last portal login</span>
            <strong>{formatDateTime(snapshot.account.last_login_at)}</strong>
          </p>
        </div>
      </Card>

      <Card title="Service notes on file">
        <p>{snapshot.profile.notes_summary || "No summary notes recorded."}</p>
        <hr className="divider" />
        <p>{snapshot.profile.special_instructions || "No special instructions on file."}</p>
      </Card>
    </div>
  );
}
