import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";

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
  const isPng =
    ext === "png" &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg =
    ext === "jpg" &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  if (!isPng && !isJpeg) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Image data is not a valid PNG or JPEG.",
      400,
    );
  }

  const dir = path.join(dataDir(), "media");
  const fileName = `${randomUUID()}.${ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buffer);
  return `/api/media/${fileName}`;
}
