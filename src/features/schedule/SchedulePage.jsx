import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { scheduleService } from "../../services";
import { ScheduleDayColumn } from "./ScheduleDayColumn";

export function SchedulePage() {
  const { db, actions } = useAppData();
  const week = scheduleService.getWeeklySchedule(db);
  const stats = scheduleService.getScheduleQuickStats(db);

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Total Visits" value={stats.total} hint="This schedule set" />
        <StatCard label="Completed" value={stats.completed} hint="Execution tracked" />
        <StatCard label="In Progress" value={stats.inProgress} hint="Live houses now" />
        <StatCard label="Scheduled" value={stats.scheduled} hint="Upcoming today/week" />
      </section>

      <Card
        title="Weekly schedule (Monday-Friday)"
        subtitle="Estimated times include travel buffer and break logic from scheduling utilities"
      >
        <div className="schedule-grid">
          {week.map((day) => (
            <ScheduleDayColumn
              key={day.day_name}
              day={day}
              onStart={actions.startVisit}
              onFinish={(visitId) => actions.finishVisit(visitId, "Finished from schedule board")}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

