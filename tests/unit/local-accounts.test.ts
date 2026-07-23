import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  getLocalAccountLoginOptions,
  loginSavedLocalAccount,
  registerLocalAccount,
  setLocalAccountLoginOptions,
} from "@/lib/auth/local-accounts";

let dataDir: string | undefined;

afterEach(async () => {
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
  delete process.env.ACHIEVEMENT_COMPASS_DATA_DIR;
  dataDir = undefined;
});

describe("local account auto login", () => {
  it("stores and clears a saved login token", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "achievd-accounts-"));
    process.env.ACHIEVEMENT_COMPASS_DATA_DIR = dataDir;

    await registerLocalAccount({
      username: "callum",
      password: "password123",
      steamId: "76561198000000000",
      steamApiKey: "0123456789abcdef0123456789abcdef",
    });

    await setLocalAccountLoginOptions("callum", {
      displayAtLogin: true,
      autoLogin: true,
      steamApiKey: "0123456789abcdef0123456789abcdef",
    });

    await expect(getLocalAccountLoginOptions("callum")).resolves.toEqual({
      displayAtLogin: true,
      autoLogin: true,
    });
    await expect(loginSavedLocalAccount("callum")).resolves.toMatchObject({
      steamApiKey: "0123456789abcdef0123456789abcdef",
    });

    await setLocalAccountLoginOptions("callum", { autoLogin: false });

    await expect(loginSavedLocalAccount("callum")).resolves.toBeNull();
  });
});
