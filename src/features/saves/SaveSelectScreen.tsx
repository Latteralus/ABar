import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { formatCents } from "@/utils/money";
import { STARTER_PROPERTY } from "@/data/properties/starterProperty";
import { STARTING_CONDITIONS } from "@/config/gameConfig";
import { LOAN_CONFIG } from "@/config/loanConfig";
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

  const acquisitionCost = acquisitionType === "buy" ? STARTER_PROPERTY.purchasePrice : 0;
  const openingRegister = STARTING_CONDITIONS.startingCash + (acceptLoan ? LOAN_CONFIG.principalCents : 0) - acquisitionCost;

  const registerNoteParts = [`${formatCents(STARTING_CONDITIONS.startingCash)} starting capital`];
  if (acceptLoan) registerNoteParts.push(`+ ${formatCents(LOAN_CONFIG.principalCents)} loan`);
  if (acquisitionCost > 0) registerNoteParts.push(`− ${formatCents(acquisitionCost)} purchase`);

  return (
    <div className="tavern-threshold-screen">
      <div className="tavern-masthead">
        <h1 className="tavern-mark">
          A<em>Bar</em>
        </h1>
        <p className="tavern-tagline">Every stool's got a story. Yours starts tonight.</p>
        <div className="tavern-rule" />
      </div>

      <div className="tavern-panes">
        <section className="tavern-pane">
          <p className="tavern-eyebrow">Still Open</p>
          <h2 className="tavern-pane-title">Tonight's Ledger</h2>

          <div className="tavern-tabs-list">
            {saveSummaries.map((save) => {
              const inTheRed = save.cash < 0;
              return (
                <div key={save.saveId} className="tavern-tab-slip">
                  <div>
                    <p className="tavern-tab-name">{save.saveName}</p>
                    <p className="tavern-tab-meta">
                      Day {save.gameDay} ·{" "}
                      {inTheRed ? <span className="in-the-red">{formatCents(save.cash)}, in the red</span> : `${formatCents(save.cash)} in the register`}
                    </p>
                  </div>
                  <div className="tavern-tab-actions">
                    <button className="tavern-btn tavern-btn-continue" onClick={() => loadGame(save.saveId)}>
                      Continue
                    </button>
                    <button className="tavern-btn tavern-btn-close" onClick={() => deleteSave(save.saveId)}>
                      Close
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="tavern-tabs-empty">
              {saveSummaries.length === 0 ? "No tabs open yet — start one on the right." : "Open a new place on the right to start another tab."}
            </div>
          </div>
        </section>

        <section className="tavern-pane">
          <p className="tavern-eyebrow">First Time In</p>
          <h2 className="tavern-pane-title">Open a New Place</h2>

          <div className="tavern-deed-field">
            <label className="tavern-deed-label" htmlFor="bar-name">
              What's the sign going to say?
            </label>
            <input id="bar-name" className="tavern-deed-input" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
          </div>

          <div className="tavern-deed-field">
            <span className="tavern-deed-label">Your First Location</span>
            <div className="tavern-property-card">
              <p className="tavern-property-name">{STARTER_PROPERTY.name}</p>
              <p className="tavern-property-desc">{STARTER_PROPERTY.description}</p>
              <div className="tavern-property-stats">
                <span>
                  Seats <strong>{STARTER_PROPERTY.seatingCapacity}</strong>
                </span>
                <span>
                  Foot traffic{" "}
                  <strong>
                    {STARTER_PROPERTY.neighborhood.trafficLevel >= 60 ? "High" : STARTER_PROPERTY.neighborhood.trafficLevel >= 35 ? "Middle" : "Low"}
                  </strong>
                </span>
                <span>
                  Nearby competition{" "}
                  <strong>
                    {STARTER_PROPERTY.neighborhood.competitionLevel >= 60
                      ? "High"
                      : STARTER_PROPERTY.neighborhood.competitionLevel >= 35
                        ? "Middle"
                        : "Low"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="tavern-deed-field">
            <span className="tavern-deed-label">How are you taking it on?</span>
            <div className="tavern-choice-row">
              <button
                className={`tavern-choice-card ${acquisitionType === "lease" ? "selected" : ""}`}
                onClick={() => setAcquisitionType("lease")}
              >
                <div className="tavern-choice-title">
                  <span>Lease</span>
                  <span className="tavern-choice-price">{formatCents(STARTER_PROPERTY.leasePricePerWeek)}/wk</span>
                </div>
                <div className="tavern-choice-sub">Less up front, rent due every week.</div>
              </button>
              <button className={`tavern-choice-card ${acquisitionType === "buy" ? "selected" : ""}`} onClick={() => setAcquisitionType("buy")}>
                <div className="tavern-choice-title">
                  <span>Buy Outright</span>
                  <span className="tavern-choice-price">{formatCents(STARTER_PROPERTY.purchasePrice)}</span>
                </div>
                <div className="tavern-choice-sub">One payment, no landlord after.</div>
              </button>
            </div>
          </div>

          <div className="tavern-deed-field">
            <span className="tavern-deed-label">Startup Financing</span>
            <button
              type="button"
              className={`tavern-loan-toggle ${acceptLoan ? "on" : ""}`}
              onClick={() => setAcceptLoan((v) => !v)}
              aria-pressed={acceptLoan}
            >
              <span className="tavern-loan-switch" />
              <span>
                <div className="tavern-loan-copy-title">Take the {formatCents(LOAN_CONFIG.principalCents)} startup loan</div>
                <div className="tavern-loan-copy-sub">
                  {LOAN_CONFIG.annualInterestRatePercent}% APR, paid back in weekly installments. Buys you room to stock the bar and staff opening
                  night.
                </div>
              </span>
            </button>
          </div>

          <div className="tavern-register">
            <div>
              <div className="tavern-register-label">Cash in the register, opening night</div>
              <div className={`tavern-register-value ${openingRegister < 0 ? "in-the-red" : ""}`}>{formatCents(openingRegister)}</div>
            </div>
            <p className="tavern-register-note">{registerNoteParts.join(" ")}.</p>
          </div>

          <button
            className="tavern-cta"
            disabled={saveName.trim().length === 0}
            onClick={() => startNewGame({ saveName, acquisitionType, acceptLoan })}
          >
            Flip the Sign to OPEN
          </button>
        </section>
      </div>

      <p className="tavern-footer-note">Local saves only, for now — no account, no server, nothing leaves this browser.</p>
    </div>
  );
}
