import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { activeTaskForEmployee, describeTask } from "@/utils/taskProgress";
import type { Employee, GameState } from "@/types";

const STATUS_LABEL: Record<Employee["status"], string> = {
  idle: "Idle",
  walking: "Walking",
  serving: "Serving",
  preparing_drink: "Preparing Drink",
  preparing_food: "Preparing Food",
  cleaning: "Cleaning",
  restocking: "Restocking",
  processing_payment: "Processing Payment",
  handling_issue: "Handling Issue",
  repairing: "Repairing",
  waiting: "Waiting",
  off_duty: "Off Duty",
};

export function EmployeeTable({ state }: { state: GameState }) {
  const columns: DataTableColumn<Employee>[] = [
    { key: "name", header: "Name", render: (e) => `${e.firstName} ${e.lastName}` },
    { key: "role", header: "Role", render: (e) => e.role },
    {
      key: "status",
      header: "Status",
      render: (e) => <Badge variant={e.status === "idle" ? "neutral" : "positive"}>{STATUS_LABEL[e.status]}</Badge>,
    },
    {
      key: "task",
      header: "Current Task",
      render: (e) => {
        const task = activeTaskForEmployee(state, e.id);
        return task ? describeTask(state, task) : "—";
      },
    },
    { key: "personality", header: "Personality", render: (e) => e.personality.map((t) => t.replace("_", " ")).join(", ") || "—" },
    { key: "speed", header: "Speed", render: (e) => `${Math.round(e.skills.speed)}` },
    { key: "accuracy", header: "Accuracy", render: (e) => `${Math.round(e.skills.accuracy)}` },
    { key: "shifts", header: "Shifts", render: (e) => `${e.shiftsWorked}` },
    { key: "served", header: "Served", render: (e) => `${e.performance.customersServed}` },
    { key: "tips", header: "Tips", render: (e) => `$${(e.performance.tipsEarnedCents / 100).toFixed(2)}` },
  ];

  return <DataTable columns={columns} rows={state.employees} rowKey={(e) => e.id} emptyLabel="No employees hired yet." />;
}
