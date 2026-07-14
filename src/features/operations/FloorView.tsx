import { STATUS_LABEL } from "./CustomerTable";
import { effectiveSeatingCapacity } from "@/data/equipment/equipmentCatalog";
import type { Attraction, Customer, CustomerStatus, GameState, Property } from "@/types";

const NOT_SEATED_STATUSES: ReadonlySet<CustomerStatus> = new Set(["waiting_for_seat", "leaving", "left", "removed"]);

type StatusBucket = "waiting" | "active" | "attraction" | "leaving";

function statusBucket(status: CustomerStatus): StatusBucket {
  if (status === "waiting_for_attraction" || status === "using_attraction") return "attraction";
  if (status === "leaving" || status === "left" || status === "removed") return "leaving";
  if (status.startsWith("waiting")) return "waiting";
  return "active";
}

function initials(customer: Customer): string {
  return `${customer.firstName[0] ?? ""}${customer.lastName[0] ?? ""}`.toUpperCase();
}

function chipTitle(customer: Customer, gameMinute: number): string {
  const waitMinutes = Math.max(0, gameMinute - customer.statusEnteredAtGameMinute);
  return `${customer.firstName} ${customer.lastName} — ${STATUS_LABEL[customer.status]} — ${waitMinutes}m`;
}

function Chip({ customer, gameMinute }: { customer: Customer; gameMinute: number }) {
  return (
    <div className={`floor-chip floor-chip-${statusBucket(customer.status)}`} title={chipTitle(customer, gameMinute)}>
      {initials(customer)}
    </div>
  );
}

/** How many seats a table of `total` capacity should be split into, each holding at most 4 — purely a visual grouping, since the data model has no real per-table entity. */
function tableSizes(total: number): number[] {
  const sizes: number[] = [];
  let remaining = total;
  while (remaining > 0) {
    sizes.push(Math.min(4, remaining));
    remaining -= Math.min(4, remaining);
  }
  return sizes;
}

interface FloorLayout {
  barSeats: (Customer | null)[];
  tables: (Customer | null)[][];
  standingSlots: (Customer | null)[];
  overflowLine: Customer[];
  seatedCapacity: number;
  standingCapacity: number;
  activeCount: number;
}

/** Pure, cosmetic derivation from live state — no seat/table identity exists in the data model, so this is recomputed fresh every render and nothing here is persisted. */
export function deriveFloorLayout(state: GameState, property: Property): FloorLayout {
  const activeCustomers = state.customers.filter((c) => c.status !== "left" && c.status !== "removed");
  const occupants = state.customers
    .filter((c) => c.seatId !== null && !NOT_SEATED_STATUSES.has(c.status))
    // Stable visual placement: do not sort by current status time, because that made customers
    // appear to hop seats every time their lifecycle state changed.
    .sort((a, b) => a.arrivalGameMinute - b.arrivalGameMinute || a.id.localeCompare(b.id));

  const seating = effectiveSeatingCapacity(state, property);
  const barSeats: (Customer | null)[] = new Array(seating.barSeatingSlots).fill(null);
  const tableSeatCounts = tableSizes(seating.tableSeatingSlots);
  const tables: (Customer | null)[][] = tableSeatCounts.map((size) => new Array(size).fill(null));

  let cursor = 0;
  for (let i = 0; i < barSeats.length && cursor < occupants.length; i++, cursor++) {
    barSeats[i] = occupants[cursor];
  }
  for (const table of tables) {
    for (let i = 0; i < table.length && cursor < occupants.length; i++, cursor++) {
      table[i] = occupants[cursor];
    }
  }

  const standingCapacity = Math.max(0, seating.customerCapacity - seating.seatingCapacity);
  const unseated = activeCustomers
    .filter((c) => c.seatId === null || c.status === "waiting_for_seat")
    .sort((a, b) => a.arrivalGameMinute - b.arrivalGameMinute || a.id.localeCompare(b.id));
  const standingSlots: (Customer | null)[] = new Array(standingCapacity).fill(null);
  for (let i = 0; i < standingSlots.length && i < unseated.length; i++) standingSlots[i] = unseated[i];
  const overflowLine = unseated.slice(standingCapacity);

  return {
    barSeats,
    tables,
    standingSlots,
    overflowLine,
    seatedCapacity: seating.seatingCapacity,
    standingCapacity,
    activeCount: activeCustomers.length,
  };
}

const ATTRACTION_ICON: Record<Attraction["category"], string> = {
  pool_table: "🎱",
  darts: "🎯",
  arcade_cabinet: "🕹️",
  karaoke_booth: "🎤",
};

function attractionRingClass(attraction: Attraction): string {
  switch (attraction.currentStatus) {
    case "operational":
      return attraction.activeSession ? "floor-ring-active" : "floor-ring-idle";
    case "degraded":
      return "floor-ring-degraded";
    default:
      return "floor-ring-failed";
  }
}

function AttractionTile({ attraction, state }: { attraction: Attraction; state: GameState }) {
  const participants = attraction.activeSession
    ? attraction.activeSession.participantIds.map((id) => state.customers.find((c) => c.id === id)).filter((c): c is Customer => !!c)
    : [];

  return (
    <div className="floor-attraction-tile">
      <div className={`floor-attraction-icon ${attractionRingClass(attraction)}`}>{ATTRACTION_ICON[attraction.category] ?? "🎯"}</div>
      <div className="floor-attraction-name">{attraction.name}</div>
      {participants.length > 0 && (
        <div className="floor-queue-row">
          {participants.map((c) => (
            <Chip key={c.id} customer={c} gameMinute={state.gameMinute} />
          ))}
        </div>
      )}
      {attraction.queue.length > 0 && (
        <div className="floor-queue-row floor-queue-waiting">
          {attraction.queue.map((entry) => (
            <div key={entry.id} className="floor-chip floor-chip-waiting" title={`Party of ${entry.customerIds.length} waiting`}>
              {entry.customerIds.length}p
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const LEGEND: { bucket: StatusBucket; label: string }[] = [
  { bucket: "waiting", label: "Waiting" },
  { bucket: "active", label: "Being served" },
  { bucket: "attraction", label: "At attraction" },
  { bucket: "leaving", label: "Leaving" },
];

interface FloorViewProps {
  state: GameState;
  property: Property;
}

export function FloorView({ state, property }: FloorViewProps) {
  const { barSeats, tables, standingSlots, overflowLine, seatedCapacity, standingCapacity, activeCount } = deriveFloorLayout(
    state,
    property,
  );
  const seatedUsed = barSeats.filter(Boolean).length + tables.reduce((sum, seats) => sum + seats.filter(Boolean).length, 0);
  const standingUsed = standingSlots.filter(Boolean).length;

  return (
    <div className="floor-view">
      <div className="floor-capacity-summary">
        <span>
          Total occupancy: {activeCount} / {property.customerCapacity}
        </span>
        <span>
          Seats: {seatedUsed} / {seatedCapacity}
        </span>
        <span>
          Standing / waiting: {standingUsed} / {standingCapacity}
        </span>
      </div>

      <div className="floor-legend">
        {LEGEND.map((entry) => (
          <span key={entry.bucket} className="floor-legend-item">
            <span className={`floor-legend-dot floor-legend-dot-${entry.bucket}`} />
            {entry.label}
          </span>
        ))}
      </div>

      <div className="floor-section-label">Bar</div>
      <div className="floor-bar-counter">
        {barSeats.map((occupant, i) => (
          <div key={i} className={`floor-stool ${occupant ? "floor-seat-occupied" : ""}`}>
            {occupant ? <Chip customer={occupant} gameMinute={state.gameMinute} /> : null}
          </div>
        ))}
      </div>

      <div className="floor-section-label">Tables</div>
      <div className="floor-tables-grid">
        {tables.map((seats, tableIndex) => (
          <div key={tableIndex} className="floor-table">
            {seats.map((occupant, seatIndex) => (
              <div key={seatIndex} className={`floor-seat ${occupant ? "floor-seat-occupied" : ""}`}>
                {occupant ? <Chip customer={occupant} gameMinute={state.gameMinute} /> : null}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="floor-section-label">Attractions</div>
      {state.attractions.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No attractions installed.</p>
      ) : (
        <div className="floor-attractions-row">
          {state.attractions.map((attraction) => (
            <AttractionTile key={attraction.id} attraction={attraction} state={state} />
          ))}
        </div>
      )}

      {standingSlots.length > 0 && (
        <>
          <div className="floor-section-label">Standing / Waiting Capacity</div>
          <div className="floor-waiting-line">
            {standingSlots.map((c, i) => (
              <div key={c?.id ?? `standing-${i}`} className={`floor-standing-slot ${c ? "floor-seat-occupied" : ""}`}>
                {c ? <Chip customer={c} gameMinute={state.gameMinute} /> : null}
              </div>
            ))}
          </div>
        </>
      )}

      {overflowLine.length > 0 && (
        <>
          <div className="floor-section-label">Overflow Line</div>
          <div className="floor-waiting-line">
            {overflowLine.map((c) => (
              <Chip key={c.id} customer={c} gameMinute={state.gameMinute} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
