import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TrendChart } from "@/components/ui/TrendChart";

describe("TrendChart", () => {
  it("renders a bounded number of gridlines for a single-point series", () => {
    // Regression test: a single data point (dataMax === dataMin) used to make the gridline step
    // fall back to a bare "1" regardless of the value's own magnitude, producing hundreds of
    // thousands of gridlines for a cents-scale value and crashing the browser tab that rendered it.
    const { container } = render(
      <TrendChart series={[{ name: "Cash", color: "#3b82f6", points: [{ day: 1, value: 1_500_000 }] }]} formatValue={(v) => String(v)} />,
    );
    const gridlines = container.querySelectorAll("line");
    expect(gridlines.length).toBeLessThanOrEqual(12);
  });

  it("renders a bounded number of gridlines when every point shares the same non-zero value", () => {
    const points = [1, 2, 3, 4].map((day) => ({ day, value: 250_000 }));
    const { container } = render(<TrendChart series={[{ name: "Score", color: "#3b82f6", points }]} formatValue={(v) => String(v)} />);
    expect(container.querySelectorAll("line").length).toBeLessThanOrEqual(12);
  });

  it("renders the empty-history fallback instead of a chart when there's no data", () => {
    const { getByText } = render(<TrendChart series={[{ name: "Cash", color: "#3b82f6", points: [] }]} />);
    expect(getByText("Not enough history yet.")).toBeInTheDocument();
  });
});
