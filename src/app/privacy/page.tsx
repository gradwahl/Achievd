import Link from "next/link";
import { productConfig } from "@/config/product";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-slate-200 sm:px-6">
      <Link href="/" className="text-sm text-cyan-300">
        Back to setup
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-white">Privacy</h1>
      <div className="mt-6 space-y-5 text-sm leading-7 text-slate-300">
        <p>
          {productConfig.name} never asks for or stores your Steam username or
          password. In standalone mode, your Steam64ID and Steam API key are
          stored in secure, HTTP-only, same-site local app cookies.
        </p>
        <p>
          Steam profile privacy controls what the app can read. Private profiles
          may expose profile basics but hide owned games or achievement
          progress. In that case, the app shows a limited-data state and keeps
          older synced data instead of deleting it.
        </p>
        <p>
          API keys are server-only and are cleared when you sign out. Account
          deletion is available in Settings and requires typing an explicit
          confirmation.
        </p>
      </div>
    </main>
  );
}
