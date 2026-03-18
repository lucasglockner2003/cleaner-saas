import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { employeesService } from "../../services";

export function EmployeesPage() {
  const { db } = useAppData();
  const employees = employeesService.listEmployeesWithMetrics(db);

  const housesCompleted = employees.reduce((total, employee) => total + employee.metrics.housesCompleted, 0);
  const hoursWorked = employees.reduce((total, employee) => total + employee.metrics.hoursWorked, 0);
  const averageProductivity = employees.length
    ? (
        employees.reduce((total, employee) => total + employee.metrics.productivity, 0) / employees.length
      ).toFixed(2)
    : "0.00";

  const columns = [
    { key: "full_name", label: "Employee" },
    { key: "role", label: "Role" },
    { key: "team_name", label: "Team" },
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
      key: "productivity",
      label: "Productivity",
      render: (row) => `${row.metrics.productivity} houses/hr`
    }
  ];

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Employees" value={employees.length} hint="Total records" />
        <StatCard label="Houses Completed" value={housesCompleted} hint="Execution output" />
        <StatCard label="Hours Worked" value={hoursWorked.toFixed(1)} hint="From visit logs" />
        <StatCard label="Avg Productivity" value={`${averageProductivity} houses/hr`} hint="Baseline indicator" />
      </section>

      <Card
        title="Employee activity and performance basics"
        subtitle="Average duration and productivity placeholders ready for advanced quality scoring"
      >
        <DataTable
          columns={columns}
          rows={employees}
          empty={<EmptyState title="No employees" message="Employee records will appear here." />}
        />
      </Card>
    </div>
  );
}

