import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

function dataDir() {
  return (
    process.env.ACHIEVEMENT_COMPASS_DATA_DIR ??
    path.join(process.cwd(), ".local-data")
  );
}

export async function saveCustomImage(value: string | null) {
  if (!value?.startsWith("data:image/")) return value;

  const match = /^data:image\/(png|jpeg);base64,(.+)$/i.exec(value);
  if (!match) return value;

  const [, type, payload] = match;
  if (!type || !payload) return value;

  const ext = type.toLowerCase() === "jpeg" ? "jpg" : "png";
  const buffer = Buffer.from(payload, "base64");
  const dir = path.join(dataDir(), "media");
  const fileName = `${randomUUID()}.${ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buffer);
  return `/api/media/${fileName}`;
}
