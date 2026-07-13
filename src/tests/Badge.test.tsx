import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>Overdue</Badge>);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("defaults to the neutral variant and applies the variant-specific class", () => {
    const { rerender } = render(<Badge>Status</Badge>);
    expect(screen.getByText("Status")).toHaveClass("badge-neutral");

    rerender(<Badge variant="negative">Status</Badge>);
    expect(screen.getByText("Status")).toHaveClass("badge-negative");
  });
});
