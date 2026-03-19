import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../hooks/useAppData";
import { crmService, growthService } from "../../services";

function stageTone(stage) {
  if (stage === "active") return "success";
  if (stage === "new" || stage === "lead") return "neutral";
  if (stage === "at_risk" || stage === "reactivation_target") return "warning";
  if (stage === "inactive" || stage === "churned") return "danger";
  return "muted";
}

function riskTone(risk) {
  if (risk === "low") return "success";
  if (risk === "medium") return "warning";
  if (risk === "high") return "danger";
  return "muted";
}

function referralTone(status) {
  if (status === "rewarded" || status === "converted") return "success";
  if (status === "invited" || status === "qualified") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function campaignTone(status) {
  if (status === "active") return "success";
  if (status === "draft" || status === "paused") return "warning";
  if (status === "completed") return "neutral";
  return "muted";
}

export function CrmPage() {
  const { db, actions, mutationState } = useAppData();
  const [filters, setFilters] = useState({
    stage: "all",
    risk: "all",
    source: "all",
    search: ""
  });
  const [referralForm, setReferralForm] = useState({
    referrer_client_id: "",
    referred_name: "",
    referred_email: "",
    source_channel: "customer_referral",
    reward_amount: 25,
    reward_type: "credit",
    notes: ""
  });
  const [referralErrors, setReferralErrors] = useState({});
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "win_back",
    channel: "email",
    audience_segment: "inactive_60_days",
    objective: ""
  });
  const [campaignErrors, setCampaignErrors] = useState({});

  const lifecycleRows = useMemo(
    () =>
      crmService.listCustomerLifecycleRows(db, {
        stage: filters.stage,
        risk: filters.risk,
        source: filters.source,
        search: filters.search
      }),
    [db, filters.risk, filters.search, filters.source, filters.stage]
  );
  const lifecycleSummary = useMemo(() => crmService.getLifecycleSummary(db), [db]);
  const automationSegments = useMemo(() => crmService.getLifecycleAutomationSegments(db), [db]);
  const growthSummary = useMemo(() => growthService.getGrowthSummary(db), [db]);
  const referrals = useMemo(() => growthService.listReferrals(db), [db]);
  const campaigns = useMemo(() => growthService.listGrowthCampaigns(db), [db]);

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  function submitReferral(event) {
    event.preventDefault();
    const result = actions.createReferral({
      ...referralForm,
      reward_amount: Number(referralForm.reward_amount)
    });

    if (!result.ok) {
      setReferralErrors(result.errors || { root: result.message });
      return;
    }

    setReferralErrors({});
    setReferralForm({
      referrer_client_id: "",
      referred_name: "",
      referred_email: "",
      source_channel: "customer_referral",
      reward_amount: 25,
      reward_type: "credit",
      notes: ""
    });
  }

  function submitCampaign(event) {
    event.preventDefault();
    const result = actions.createGrowthCampaign(campaignForm);
    if (!result.ok) {
      setCampaignErrors(result.errors || { root: result.message });
      return;
    }

    setCampaignErrors({});
    setCampaignForm({
      name: "",
      type: "win_back",
      channel: "email",
      audience_segment: "inactive_60_days",
      objective: ""
    });
  }

  const lifecycleColumns = [
    { key: "client_name", label: "Client" },
    { key: "suburb", label: "Suburb" },
    { key: "service_frequency", label: "Frequency" },
    {
      key: "lifecycle_stage",
      label: "Lifecycle",
      render: (row) => (
        <select
          value={row.lifecycle_stage}
          onChange={(event) => actions.updateClientLifecycle(row.client_id, { lifecycle_stage: event.target.value })}
        >
          <option value="lead">Lead</option>
          <option value="new">New</option>
          <option value="active">Active</option>
          <option value="at_risk">At risk</option>
          <option value="inactive">Inactive</option>
          <option value="reactivation_target">Reactivation target</option>
          <option value="churned">Churned</option>
        </select>
      )
    },
    {
      key: "churn_risk",
      label: "Churn risk",
      render: (row) => (
        <select
          value={row.churn_risk}
          onChange={(event) => actions.updateClientLifecycle(row.client_id, { churn_risk: event.target.value })}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      )
    },
    {
      key: "vip_level",
      label: "VIP",
      render: (row) => (
        <select
          value={row.vip_level}
          onChange={(event) => actions.updateClientLifecycle(row.client_id, { vip_level: event.target.value })}
        >
          <option value="none">None</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
        </select>
      )
    },
    {
      key: "total_revenue",
      label: "Revenue",
      render: (row) => `$${row.total_revenue.toFixed(2)}`
    },
    {
      key: "outstanding_balance",
      label: "Outstanding",
      render: (row) => `$${row.outstanding_balance.toFixed(2)}`
    },
    {
      key: "days_since_last_visit",
      label: "Days Since Service",
      render: (row) => row.days_since_last_visit ?? "-"
    },
    {
      key: "signals",
      label: "Signals",
      render: (row) => (
        <div className="row-chip-list">
          <Badge value={row.lifecycle_stage} tone={stageTone(row.lifecycle_stage)} />
          <Badge value={row.churn_risk} tone={riskTone(row.churn_risk)} />
          {row.win_back_eligible ? <Badge value="win-back" tone="warning" /> : null}
          {row.vip_level !== "none" ? <Badge value={row.vip_level} tone="accent" /> : null}
        </div>
      )
    }
  ];

  const referralColumns = [
    { key: "referrer_name", label: "Referrer" },
    { key: "referred_name", label: "Referred" },
    { key: "referred_email", label: "Email" },
    { key: "source_channel", label: "Channel" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={referralTone(row.status)} />
    },
    { key: "reward_amount", label: "Reward", render: (row) => `$${Number(row.reward_amount).toFixed(2)}` },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inline-actions">
          {row.status !== "qualified" && row.status !== "converted" && row.status !== "rewarded" ? (
            <button type="button" className="btn btn-ghost" onClick={() => actions.setReferralStatus(row.id, "qualified")}>
              Qualify
            </button>
          ) : null}
          {row.status !== "converted" && row.status !== "rewarded" ? (
            <button type="button" className="btn btn-ghost" onClick={() => actions.setReferralStatus(row.id, "converted")}>
              Convert
            </button>
          ) : null}
          {row.status === "converted" ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => actions.setReferralStatus(row.id, "rewarded", { reward_status: "issued" })}
            >
              Reward
            </button>
          ) : null}
        </div>
      )
    }
  ];

  const campaignColumns = [
    { key: "name", label: "Campaign" },
    { key: "type", label: "Type" },
    { key: "channel", label: "Channel" },
    { key: "audience_segment", label: "Audience" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={campaignTone(row.status)} />
    },
    {
      key: "performance",
      label: "Performance",
      render: (row) => `${row.conversion_count}/${row.sent_count} conversions`
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inline-actions">
          {row.status === "draft" || row.status === "paused" ? (
            <button type="button" className="btn btn-ghost" onClick={() => actions.setGrowthCampaignStatus(row.id, "active")}>
              Activate
            </button>
          ) : null}
          {row.status === "active" ? (
            <button type="button" className="btn btn-ghost" onClick={() => actions.setGrowthCampaignStatus(row.id, "paused")}>
              Pause
            </button>
          ) : null}
          {row.status !== "completed" ? (
            <button type="button" className="btn btn-ghost" onClick={() => actions.setGrowthCampaignStatus(row.id, "completed")}>
              Complete
            </button>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <div className="page-grid">
      <section className="toolbar">
        <label>
          Lifecycle stage
          <select value={filters.stage} onChange={(event) => updateFilter("stage", event.target.value)}>
            <option value="all">All</option>
            <option value="lead">Lead</option>
            <option value="new">New</option>
            <option value="active">Active</option>
            <option value="at_risk">At risk</option>
            <option value="inactive">Inactive</option>
            <option value="reactivation_target">Reactivation target</option>
            <option value="churned">Churned</option>
          </select>
        </label>
        <label>
          Churn risk
          <select value={filters.risk} onChange={(event) => updateFilter("risk", event.target.value)}>
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Source
          <select value={filters.source} onChange={(event) => updateFilter("source", event.target.value)}>
            <option value="all">All</option>
            {growthSummary.acquisitionBySource.map((row) => (
              <option key={row.source} value={row.source}>
                {row.source}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          Search
          <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Client, suburb, source" />
        </label>
        <button type="button" className="btn" onClick={() => actions.refreshLifecycleSignals()} disabled={mutationState.refreshLifecycleSignals}>
          {mutationState.refreshLifecycleSignals ? "Refreshing..." : "Refresh lifecycle signals"}
        </button>
      </section>

      <section className="stat-grid">
        <StatCard label="Active Clients" value={lifecycleSummary.activeClients} hint="Lifecycle active stage" />
        <StatCard label="At Risk" value={lifecycleSummary.atRiskClients} hint={`${lifecycleSummary.highRiskClients} high-risk`} />
        <StatCard label="Leads" value={lifecycleSummary.leads} hint="Pipeline + early lifecycle" />
        <StatCard label="VIP Clients" value={lifecycleSummary.vipClients} hint={`Revenue $${lifecycleSummary.lifetimeRevenue.toFixed(0)}`} />
      </section>

      <section className="split-grid">
        <Card title="Lifecycle automation readiness">
          <div className="detail-list">
            <p>
              <span>Win-back candidates</span>
              <strong>{automationSegments.winBackCandidates.length}</strong>
            </p>
            <p>
              <span>Upsell opportunities</span>
              <strong>{automationSegments.upsellCandidates.length}</strong>
            </p>
            <p>
              <span>Deep clean recommendations</span>
              <strong>{automationSegments.deepCleanRecommendations.length}</strong>
            </p>
            <p>
              <span>Repeat booking opportunities</span>
              <strong>{automationSegments.repeatBookingOpportunities.length}</strong>
            </p>
            <p>
              <span>Total outstanding balance</span>
              <strong>${lifecycleSummary.totalOutstandingBalance.toFixed(2)}</strong>
            </p>
          </div>
        </Card>

        <Card title="Growth and acquisition summary">
          <div className="detail-list">
            <p>
              <span>Referral conversions</span>
              <strong>{growthSummary.referrals.converted}</strong>
            </p>
            <p>
              <span>Referral rewards pending</span>
              <strong>{growthSummary.referrals.rewardsPending}</strong>
            </p>
            <p>
              <span>Active campaigns</span>
              <strong>{growthSummary.campaigns.active}</strong>
            </p>
            <p>
              <span>Campaign conversion rate</span>
              <strong>{growthSummary.campaigns.conversionRate}%</strong>
            </p>
          </div>
        </Card>
      </section>

      <Card title="Customer lifecycle control panel">
        <DataTable
          columns={lifecycleColumns}
          rows={lifecycleRows}
          empty={<EmptyState title="No lifecycle rows" message="No clients match these lifecycle filters." />}
        />
      </Card>

      <section className="split-grid">
        <Card title="Log referral" subtitle="Track referral pipeline and reward readiness">
          <form className="form-grid" onSubmit={submitReferral}>
            <label className="span-2">
              Referrer client
              <select
                value={referralForm.referrer_client_id}
                onChange={(event) => setReferralForm((current) => ({ ...current, referrer_client_id: event.target.value }))}
              >
                <option value="">Select client</option>
                {db.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name}
                  </option>
                ))}
              </select>
              {referralErrors.referrer_client_id ? <span className="field-error">{referralErrors.referrer_client_id}</span> : null}
            </label>
            <label>
              Referred name
              <input
                value={referralForm.referred_name}
                onChange={(event) => setReferralForm((current) => ({ ...current, referred_name: event.target.value }))}
              />
              {referralErrors.referred_name ? <span className="field-error">{referralErrors.referred_name}</span> : null}
            </label>
            <label>
              Referred email
              <input
                value={referralForm.referred_email}
                onChange={(event) => setReferralForm((current) => ({ ...current, referred_email: event.target.value }))}
              />
              {referralErrors.referred_email ? <span className="field-error">{referralErrors.referred_email}</span> : null}
            </label>
            <label>
              Source channel
              <select
                value={referralForm.source_channel}
                onChange={(event) => setReferralForm((current) => ({ ...current, source_channel: event.target.value }))}
              >
                <option value="customer_referral">Customer referral</option>
                <option value="portal_share">Portal share</option>
                <option value="partner">Partner</option>
              </select>
            </label>
            <label>
              Reward type
              <select
                value={referralForm.reward_type}
                onChange={(event) => setReferralForm((current) => ({ ...current, reward_type: event.target.value }))}
              >
                <option value="credit">Credit</option>
                <option value="voucher">Voucher</option>
                <option value="cash">Cash</option>
              </select>
            </label>
            <label>
              Reward amount
              <input
                type="number"
                min={0}
                step="0.01"
                value={referralForm.reward_amount}
                onChange={(event) => setReferralForm((current) => ({ ...current, reward_amount: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Notes
              <input value={referralForm.notes} onChange={(event) => setReferralForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            {referralErrors.root ? <p className="field-error span-2">{referralErrors.root}</p> : null}
            <div className="form-actions span-2">
              <button type="submit" className="btn" disabled={mutationState.createReferral}>
                {mutationState.createReferral ? "Saving..." : "Create referral"}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Create campaign" subtitle="Lifecycle and upsell campaign foundation">
          <form className="form-grid" onSubmit={submitCampaign}>
            <label className="span-2">
              Campaign name
              <input value={campaignForm.name} onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))} />
              {campaignErrors.name ? <span className="field-error">{campaignErrors.name}</span> : null}
            </label>
            <label>
              Type
              <select value={campaignForm.type} onChange={(event) => setCampaignForm((current) => ({ ...current, type: event.target.value }))}>
                <option value="win_back">Win-back</option>
                <option value="upsell">Upsell</option>
                <option value="referral">Referral</option>
                <option value="retention">Retention</option>
              </select>
            </label>
            <label>
              Channel
              <select value={campaignForm.channel} onChange={(event) => setCampaignForm((current) => ({ ...current, channel: event.target.value }))}>
                <option value="email">Email</option>
                <option value="portal">Portal</option>
                <option value="sms">SMS</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label>
              Audience segment
              <input
                value={campaignForm.audience_segment}
                onChange={(event) => setCampaignForm((current) => ({ ...current, audience_segment: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Objective
              <input
                value={campaignForm.objective}
                onChange={(event) => setCampaignForm((current) => ({ ...current, objective: event.target.value }))}
              />
            </label>
            {campaignErrors.root ? <p className="field-error span-2">{campaignErrors.root}</p> : null}
            <div className="form-actions span-2">
              <button type="submit" className="btn" disabled={mutationState.createGrowthCampaign}>
                {mutationState.createGrowthCampaign ? "Saving..." : "Create campaign"}
              </button>
            </div>
          </form>
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Referral tracker">
          <DataTable
            columns={referralColumns}
            rows={referrals}
            empty={<EmptyState title="No referrals" message="Referral records will appear here." />}
          />
        </Card>

        <Card title="Campaign tracker">
          <DataTable
            columns={campaignColumns}
            rows={campaigns}
            empty={<EmptyState title="No campaigns" message="Create a campaign to track lifecycle outreach." />}
          />
        </Card>
      </section>
    </div>
  );
}

