import { clearSessionResponse } from "@/lib/auth/session";

export async function POST() {
  return clearSessionResponse("/");
}

export async function GET() {
  return clearSessionResponse("/");
}
