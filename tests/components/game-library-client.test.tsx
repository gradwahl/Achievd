import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { testGames } from "../fixtures/app-fixtures";
import { GameLibraryClient } from "@/components/games/game-library-client";

describe("GameLibraryClient", () => {
  it("searches and filters games", async () => {
    const user = userEvent.setup();
    render(
      <GameLibraryClient
        games={testGames}
        defaultSort="completion"
        csrfToken="test-csrf"
      />,
    );

    await user.type(screen.getByLabelText(/search games/i), "portal");
    expect(screen.getByText("Portal 2")).toBeInTheDocument();
    expect(screen.queryByText("Celeste")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/search games/i));
    await user.selectOptions(
      screen.getByLabelText(/filter games/i),
      "incomplete",
    );
    const results = within(screen.getByTestId("game-results"));
    expect(results.getByText("Portal 2")).toBeInTheDocument();
    expect(results.queryByText("Townscaper")).not.toBeInTheDocument();
  });

  it("shows unobtainable achievement count on game cards", () => {
    render(
      <GameLibraryClient
        games={testGames}
        defaultSort="completion"
        csrfToken="test-csrf"
      />,
    );

    expect(screen.getByLabelText("1 Unobtainable")).toHaveAttribute(
      "title",
      "1 Unobtainable",
    );
  });
});
