import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { EmployeeTable } from "@/features/operations/EmployeeTable";
import { HireEmployeeModal } from "./HireEmployeeModal";

export function EmployeesScreen() {
  const state = useGameStore((s) => s.state);
  const fireEmployee = useGameStore((s) => s.fireEmployee);
  if (!state) return null;

  return (
    <div>
      <div className="page-header">
        <h1>Employees</h1>
      </div>

      <HireEmployeeModal />

      <Card title="Current Staff">
        <EmployeeTable state={state} />
        {state.employees.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {state.employees.map((e) => (
              <button key={e.id} className="btn btn-danger" onClick={() => fireEmployee(e.id)}>
                Let go: {e.firstName} {e.lastName}
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
