import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../hooks/useAppData";
import { employeesService } from "../../services";

function onTimeTone(onTimeRate) {
  if (onTimeRate >= 0.8) return "success";
  if (onTimeRate >= 0.6) return "warning";
  return "danger";
}

export function EmployeesPage() {
  const { db, actions } = useAppData();
  const employees = employeesService.listEmployeesWithMetrics(db);

  const housesCompleted = employees.reduce((total, employee) => total + employee.metrics.housesCompleted, 0);
  const hoursWorked = employees.reduce((total, employee) => total + employee.metrics.hoursWorked, 0);
  const totalRevenue = employees.reduce((total, employee) => total + employee.metrics.revenue, 0);
  const averageProductivity = employees.length
    ? (
        employees.reduce((total, employee) => total + employee.metrics.productivity, 0) / employees.length
      ).toFixed(2)
    : "0.00";

  const columns = [
    { key: "full_name", label: "Employee" },
    { key: "role", label: "Role" },
    {
      key: "team_name",
      label: "Team Assignment",
      render: (row) => (
        <select value={row.team_id ?? ""} onChange={(event) => actions.reassignEmployee(row.id, event.target.value || null)}>
          <option value="">Unassigned</option>
          {db.teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      )
    },
    {
      key: "hours_worked",
      label: "Hours Worked",
      render: (row) => row.metrics.hoursWorked
    },
    {
      key: "houses_completed",
      label: "Houses Completed",
      render: (row) => row.metrics.housesCompleted
    },
    {
      key: "average_duration_min",
      label: "Avg Duration",
      render: (row) => (row.metrics.averageDurationMin ? `${row.metrics.averageDurationMin} min` : "-")
    },
    {
      key: "on_time_rate",
      label: "On-time Rate",
      render: (row) => <Badge value={`${Math.round(row.metrics.onTimeRate * 100)}%`} tone={onTimeTone(row.metrics.onTimeRate)} />
    },
    {
      key: "late_starts",
      label: "Late Starts",
      render: (row) => row.metrics.lateStarts
    },
    {
      key: "productivity",
      label: "Productivity",
      render: (row) => `${row.metrics.productivity} houses/hr`
    },
    {
      key: "revenue",
      label: "Revenue",
      render: (row) => `$${row.metrics.revenue.toFixed(2)}`
    }
  ];

  const topPerformers = [...employees]
    .filter((employee) => employee.metrics.housesCompleted > 0)
    .sort((a, b) => b.metrics.productivity - a.metrics.productivity)
    .slice(0, 5);

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Employees" value={employees.length} hint="Total records" />
        <StatCard label="Houses Completed" value={housesCompleted} hint="Execution output" />
        <StatCard label="Hours Worked" value={hoursWorked.toFixed(1)} hint="From visit logs" />
        <StatCard label="Avg Productivity" value={`${averageProductivity} houses/hr`} hint={`Revenue $${totalRevenue.toFixed(2)}`} />
      </section>

      <Card
        title="Employee productivity and assignment"
        subtitle="Reassign team membership and monitor on-time execution behavior"
      >
        <DataTable
          columns={columns}
          rows={employees}
          empty={<EmptyState title="No employees" message="Employee records will appear here." />}
        />
      </Card>

      <Card title="Top productivity performers">
        {topPerformers.length ? (
          <div className="stack-list">
            {topPerformers.map((employee) => (
              <article key={employee.id} className="row-item">
                <div>
                  <strong>{employee.full_name}</strong>
                  <p className="muted">
                    {employee.team_name} - {employee.metrics.housesCompleted} houses - {employee.metrics.productivity} houses/hr
                  </p>
                </div>
                <Badge value={`$${employee.metrics.revenue.toFixed(0)}`} tone="accent" />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No performance data" message="Complete more visits to populate productivity ranking." />
        )}
      </Card>
    </div>
  );
}

