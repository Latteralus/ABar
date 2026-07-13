import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { formatCents } from "@/utils/money";
import { STARTER_PROPERTY } from "@/data/properties/starterProperty";
import type { AcquisitionType } from "@/types";

export function SaveSelectScreen() {
  const saveSummaries = useGameStore((s) => s.saveSummaries);
  const refreshSaveList = useGameStore((s) => s.refreshSaveList);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const deleteSave = useGameStore((s) => s.deleteSave);

  const [saveName, setSaveName] = useState("My Bar");
  const [acquisitionType, setAcquisitionType] = useState<AcquisitionType>("lease");
  const [acceptLoan, setAcceptLoan] = useState(true);

  useEffect(() => {
    refreshSaveList();
  }, [refreshSaveList]);

  return (
    <div className="centered-screen">
      <div style={{ width: 720 }}>
        <h1 style={{ marginBottom: 4 }}>ABar</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>Bar Management Sandbox</p>

        <div className="card">
          <p className="card-title">Existing Saves</p>
          {saveSummaries.length === 0 && <p style={{ color: "var(--text-muted)" }}>No saves yet.</p>}
          {saveSummaries.map((save) => (
            <div
              key={save.saveId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <strong>{save.saveName}</strong>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  Day {save.gameDay} · {formatCents(save.cash)} cash
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={() => loadGame(save.saveId)}>
                  Load
                </button>
                <button className="btn btn-danger" onClick={() => deleteSave(save.saveId)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <p className="card-title">Start a New Save</p>
          <div className="form-row">
            <label>Bar Name</label>
            <input value={saveName} onChange={(e) => setSaveName(e.target.value)} />
          </div>

          <div className="form-row">
            <label>{STARTER_PROPERTY.name}</label>
            <p style={{ color: "var(--text-secondary)", margin: "4px 0" }}>{STARTER_PROPERTY.description}</p>
          </div>

          <div className="form-row">
            <label>Acquisition</label>
            <select value={acquisitionType} onChange={(e) => setAcquisitionType(e.target.value as AcquisitionType)}>
              <option value="lease">Lease — {formatCents(STARTER_PROPERTY.leasePricePerWeek)}/week</option>
              <option value="buy">Buy — {formatCents(STARTER_PROPERTY.purchasePrice)} flat</option>
            </select>
          </div>

          <div className="form-row">
            <label>
              <input type="checkbox" checked={acceptLoan} onChange={(e) => setAcceptLoan(e.target.checked)} /> Accept the $10,000 startup
              loan
            </label>
          </div>

          <button className="btn btn-primary" onClick={() => startNewGame({ saveName, acquisitionType, acceptLoan })}>
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
