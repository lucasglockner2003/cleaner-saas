import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

function getStepTone(step) {
  if (step.completed) {
    return "success";
  }
  if (step.blocking) {
    return "danger";
  }
  return "warning";
}

export function PilotOnboardingCard({ steps = [] }) {
  const completedCount = steps.filter((step) => step.completed).length;
  const remainingCount = Math.max(0, steps.length - completedCount);
  const blockingCount = steps.filter((step) => step.blocking && !step.completed).length;

  return (
    <Card title="Pilot onboarding checklist" subtitle="Follow this sequence to safely onboard first operators and first tenant data.">
      <div className="detail-list">
        <p>
          <span>Checklist progress</span>
          <strong>
            {completedCount}/{steps.length}
          </strong>
        </p>
        <p>
          <span>Remaining setup</span>
          <strong>{remainingCount}</strong>
        </p>
        <p>
          <span>Blocking items</span>
          <strong>{blockingCount}</strong>
        </p>
      </div>

      <div className="stack-list">
        {steps.map((step) => (
          <article key={step.key} className="onboarding-step">
            <div>
              <strong>{step.title}</strong>
              <p className="muted">{step.description}</p>
            </div>
            <div className="inline-actions">
              <Badge
                value={step.completed ? "ready" : step.blocking ? "action required" : "pending"}
                tone={getStepTone(step)}
              />
              {step.ctaPath ? (
                <Link className="btn btn-ghost" to={step.ctaPath}>
                  {step.ctaLabel || "Open"}
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {blockingCount ? (
        <p className="field-error">Resolve blocking items before live pilot dispatch.</p>
      ) : (
        <p className="muted">No blocking setup issues detected. Continue with smoke checks and pilot rollout checklist.</p>
      )}
    </Card>
  );
}
