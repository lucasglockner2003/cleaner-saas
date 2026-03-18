import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { clientsService } from "../../services";
import { ClientFilters } from "./ClientFilters";
import { ClientsTable } from "./ClientsTable";
import { ClientCreateForm } from "./ClientCreateForm";

export function ClientsPage() {
  const { db, actions } = useAppData();

  const [suburbFilter, setSuburbFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");

  const suburbs = clientsService.listSuburbs(db);
  const filteredClients = clientsService.listClients(db, {
    suburb: suburbFilter,
    status: statusFilter,
    search: searchFilter
  });
  const bySuburb = clientsService.groupClientsBySuburb(db);

  const activeCount = useMemo(
    () => db.clients.filter((client) => client.status === "active").length,
    [db.clients]
  );
  const inactiveCount = db.clients.length - activeCount;
  const suburbCount = Object.keys(bySuburb).length;

  return (
    <div className="page-grid">
      <Card
        title="Register new client"
        subtitle="MVP creation flow for client onboarding and operational scheduling setup"
      >
        <ClientCreateForm serviceTypes={db.serviceTypes} onCreate={actions.createClient} />
      </Card>

      <section className="stat-grid">
        <StatCard label="Total Clients" value={db.clients.length} hint="All records" />
        <StatCard label="Active Clients" value={activeCount} hint="Current service base" />
        <StatCard label="Inactive Clients" value={inactiveCount} hint="Reactivation opportunity" />
        <StatCard label="Suburbs Covered" value={suburbCount} hint="Grouping ready" />
      </section>

      <Card title="Client operations registry" subtitle="Group and filter by suburb for scheduling and profitability analysis">
        <ClientFilters
          suburbs={suburbs}
          suburbFilter={suburbFilter}
          statusFilter={statusFilter}
          searchFilter={searchFilter}
          onSuburbChange={setSuburbFilter}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearchFilter}
        />
        <ClientsTable clients={filteredClients} />
      </Card>

      <Card title="Suburb workload view">
        <div className="suburb-grid">
          {Object.entries(bySuburb).map(([suburb, clientsInSuburb]) => (
            <article key={suburb} className="suburb-card">
              <h4>{suburb}</h4>
              <p>{clientsInSuburb.length} clients</p>
              <p className="muted">
                Avg estimate{" "}
                {Math.round(
                  clientsInSuburb.reduce((total, client) => total + client.estimated_duration_min, 0) /
                    Math.max(1, clientsInSuburb.length)
                )}{" "}
                min
              </p>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
