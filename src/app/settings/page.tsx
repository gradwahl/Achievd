import { requireSession } from "@/lib/auth/session";
import { getLocalAccountLoginOptions } from "@/lib/auth/local-accounts";
import { getSettingsData } from "@/lib/services/app-service";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session = await requireSession();
  const [preferences, loginOptions] = await Promise.all([
    getSettingsData(session.id),
    getLocalAccountLoginOptions(session.username),
  ]);

  return (
    <AppShell session={session}>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-2 text-sm text-slate-400">
            Defaults for spoilers, library views, rarity bands, and account
            data.
          </p>
        </div>
        <SettingsClient
          initialPreferences={preferences}
          initialDisplayProfileAtLogin={loginOptions.displayAtLogin}
          initialAutoLogin={loginOptions.autoLogin}
          csrfToken={session.csrfToken}
        />
      </div>
    </AppShell>
  );
}
