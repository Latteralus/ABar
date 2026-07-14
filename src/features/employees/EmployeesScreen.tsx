import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { EmployeeTable } from "@/features/operations/EmployeeTable";
import { HireEmployeeModal } from "./HireEmployeeModal";
import { activeProperty } from "@/simulation/engine/activeProperty";

export function EmployeesScreen() {
  const state = useGameStore((s) => s.state);
  const fireEmployee = useGameStore((s) => s.fireEmployee);
  if (!state) return null;
  const prop = activeProperty(state);

  return (
    <div>
      <div className="page-header">
        <h1>Employees</h1>
      </div>

      <HireEmployeeModal />

      <Card title="Current Staff">
        <EmployeeTable prop={prop} />
        {prop.employees.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {prop.employees.map((e) => (
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
