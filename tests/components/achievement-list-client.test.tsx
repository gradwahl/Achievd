import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { testAchievementsByAppId } from "../fixtures/app-fixtures";
import { AchievementListClient } from "@/components/games/achievement-list-client";

describe("AchievementListClient", () => {
  it("filters spoilers and links achievement guides", async () => {
    const user = userEvent.setup();
    render(
      <AchievementListClient
        achievements={testAchievementsByAppId[1]!}
        defaultShowHidden={false}
        gameName="Celeste"
      />,
    );

    expect(screen.getAllByText("Hidden achievement").length).toBeGreaterThan(0);
    expect(screen.getByText("Base Game")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show spoilers/i }));
    expect(screen.getByText("Moon Berry")).toBeInTheDocument();
    expect(screen.getByText("Farewell")).toBeInTheDocument();
    expect(screen.getByText("Unobtainable", { selector: "span" })).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/filter unlock state/i),
      "locked",
    );
    expect(screen.queryByText("Reach the Summit")).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText(/filter unlock state/i),
      "unobtainable",
    );
    expect(screen.getByText("Moon Berry")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /^pin$/i })).toBeNull();
    expect(
      screen.getByLabelText(/search google for moon berry guide/i),
    ).toHaveAttribute(
      "href",
      "https://www.google.com/search?q=Celeste%20Moon%20Berry%20achievement%20guide",
    );
  });
});
