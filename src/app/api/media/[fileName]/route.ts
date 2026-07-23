import { readFile } from "node:fs/promises";
import path from "node:path";

type Params = { params: Promise<{ fileName: string }> };

function dataDir() {
  return (
    process.env.ACHIEVEMENT_COMPASS_DATA_DIR ??
    path.join(process.cwd(), ".local-data")
  );
}

export async function GET(_request: Request, { params }: Params) {
  const { fileName } = await params;
  if (!/^[a-f0-9-]+\.(?:jpg|png)$/i.test(fileName)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(path.join(dataDir(), "media", fileName));
    return new Response(file, {
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": fileName.endsWith(".png") ? "image/png" : "image/jpeg",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
