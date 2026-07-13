import { useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { formatCents } from "@/utils/money";
import { HIRING_CONFIG } from "@/config/employeeConfig";
import { ROLE_DESCRIPTIONS } from "@/data/employees/roleDescriptions";
import type { Employee, EmployeeRole } from "@/types";

/** Every role except manager (Stage 8 automation) can be hired starting Stage 4. */
const HIRABLE_ROLES: EmployeeRole[] = ["bartender", "server", "host", "barback", "security", "dishwasher", "cook", "maintenance"];

export function HireEmployeeModal() {
  const generateHiringCandidates = useGameStore((s) => s.generateHiringCandidates);
  const hireEmployee = useGameStore((s) => s.hireEmployee);

  const [role, setRole] = useState<EmployeeRole>("bartender");
  const [candidates, setCandidates] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const description = ROLE_DESCRIPTIONS[role];

  return (
    <Card title="Hire Staff">
      <div className="form-row">
        <label>Role</label>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as EmployeeRole);
            setCandidates([]);
            setError(null);
          }}
        >
          {HIRABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 0 }}>
        {description.primary}
        {description.secondary && <> {description.secondary}</>}
      </p>
      <button
        className="btn"
        onClick={() => {
          const result = generateHiringCandidates(role);
          if (result.success) {
            setCandidates(result.candidates);
            setError(null);
          } else {
            setCandidates([]);
            setError(result.error ?? "Search failed.");
          }
        }}
      >
        Find Candidates ({formatCents(HIRING_CONFIG.candidateSearchCostCents)})
      </button>
      {error && <p style={{ color: "var(--negative)" }}>{error}</p>}

      {candidates.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {candidates.map((candidate) => (
            <div key={candidate.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <strong>
                  {candidate.firstName} {candidate.lastName}
                </strong>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Wage {formatCents(candidate.wagePerShiftCents)}/shift · Speed {Math.round(candidate.skills.speed)} · Accuracy{" "}
                  {Math.round(candidate.skills.accuracy)}
                </div>
                {candidate.personality.length > 0 && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Personality: {candidate.personality.map((t) => t.replace("_", " ")).join(", ")}
                  </div>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  hireEmployee(candidate);
                  setCandidates([]);
                }}
              >
                Hire
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
