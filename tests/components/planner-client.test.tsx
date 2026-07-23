import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testPinnedAchievements } from "../fixtures/app-fixtures";
import { PlannerClient } from "@/components/planner/planner-client";

describe("PlannerClient", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        const body =
          init && "body" in init ? JSON.parse(String(init.body)) : {};
        return Response.json({
          ok: true,
          item: { ...testPinnedAchievements[0], ...body },
          items: testPinnedAchievements,
        });
      }),
    );
  });

  it("saves notes and manual progress", async () => {
    const user = userEvent.setup();
    render(
      <PlannerClient
        initialItems={testPinnedAchievements}
        csrfToken="csrf"
      />,
    );

    await user.clear(screen.getAllByLabelText(/notes/i)[0]!);
    await user.type(screen.getAllByLabelText(/notes/i)[0]!, "Practice route");
    await user.clear(screen.getAllByLabelText(/manual progress/i)[0]!);
    await user.type(
      screen.getAllByLabelText(/manual progress/i)[0]!,
      "1 checkpoint",
    );
    await user.click(screen.getAllByRole("button", { name: /save/i })[0]!);

    expect(await screen.findByText("Planner updated.")).toBeInTheDocument();
  });
});
