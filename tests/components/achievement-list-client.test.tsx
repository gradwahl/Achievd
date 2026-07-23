import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testAchievementsByAppId } from "../fixtures/app-fixtures";
import { AchievementListClient } from "@/components/games/achievement-list-client";

describe("AchievementListClient", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: true, item: { id: "pin-new" } })),
    );
  });

  it("filters spoilers and pins achievements", async () => {
    const user = userEvent.setup();
    render(
      <AchievementListClient
        achievements={testAchievementsByAppId[1]!}
        csrfToken="csrf"
        defaultShowHidden={false}
        gameName="Celeste"
      />,
    );

    expect(screen.getAllByText("Hidden achievement").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /show spoilers/i }));
    expect(screen.getByText("Moon Berry")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/filter unlock state/i),
      "locked",
    );
    expect(screen.queryByText("Reach the Summit")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /^pin$/i })[0]!);
    expect(await screen.findByText("Pinned to planner.")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/search google for moon berry guide/i),
    ).toHaveAttribute(
      "href",
      "https://www.google.com/search?q=Celeste%20Moon%20Berry%20achievement%20guide",
    );
  });
});
