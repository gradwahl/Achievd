import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { saveCustomImage } from "@/lib/media/custom-images";

let dataDir: string | undefined;

afterEach(async () => {
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
  delete process.env.ACHIEVEMENT_COMPASS_DATA_DIR;
});

describe("saveCustomImage", () => {
  it("rejects fake image payloads", async () => {
    await expect(
      saveCustomImage(
        `data:image/png;base64,${Buffer.from("nope").toString("base64")}`,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("stores valid png payloads", async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), "achievd-media-"));
    process.env.ACHIEVEMENT_COMPASS_DATA_DIR = dataDir;
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const url = await saveCustomImage(
      `data:image/png;base64,${png.toString("base64")}`,
    );

    expect(url).toMatch(/^\/api\/media\/[a-f0-9-]+\.png$/);
    await expect(
      readFile(path.join(dataDir, "media", url!.split("/").at(-1)!)),
    ).resolves.toEqual(png);
  });
});
