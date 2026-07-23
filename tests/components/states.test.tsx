import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardLoading from "@/app/dashboard/loading";
import DashboardError from "@/app/dashboard/error";
import { EmptyState } from "@/components/ui/empty-state";

describe("loading and error states", () => {
  it("renders skeletons and friendly errors", () => {
    render(<DashboardLoading />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );

    render(<DashboardError error={new Error("Boom")} reset={vi.fn()} />);
    expect(screen.getByText(/dashboard failed/i)).toBeInTheDocument();

    render(<EmptyState title="Nothing here">Try again later.</EmptyState>);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
