import { redirect } from "next/navigation";
import { safeReturnTo } from "@/lib/security/redirects";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo ?? null);
  redirect(`/?mode=login&returnTo=${encodeURIComponent(returnTo)}`);
}
