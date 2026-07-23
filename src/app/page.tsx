import Link from "next/link";
import Image from "next/image";
import { KeyRound, UserPlus } from "lucide-react";
import { productConfig } from "@/config/product";
import { listDisplayLoginProfiles } from "@/lib/auth/local-accounts";
import { safeReturnTo } from "@/lib/security/redirects";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    mode?: string;
    profile?: string;
    returnTo?: string;
  }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo ?? null);
  const mode =
    params.mode === "register"
      ? "register"
      : params.mode === "login"
        ? "login"
        : null;
  const profiles = await listDisplayLoginProfiles();
  const selectedProfile =
    mode === "login"
      ? profiles.find((profile) => profile.username === params.profile)
      : undefined;

  return (
    <main className="grid min-h-screen place-items-center bg-[#080b10] px-4 py-8 text-slate-100">
      <section className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3">
          <Image
            src="/app-logo.png"
            alt=""
            width={40}
            height={40}
            priority
            className="h-10 w-10 rounded-md"
          />
          <div>
            <p className="font-semibold">{productConfig.name}</p>
            <p className="text-xs text-slate-400">Standalone login</p>
          </div>
        </div>

        {!mode ? (
          <div className="py-14 text-center">
            <h1 className="text-2xl font-bold text-white">
              Open your achievement dashboard
            </h1>
            {profiles.length ? (
              <div className="mt-8 grid gap-3">
                {profiles.map((profile) => (
                  <Link
                    key={profile.username}
                    href={
                      profile.autoLogin
                        ? `/local-login?username=${encodeURIComponent(profile.username)}&returnTo=${encodeURIComponent(returnTo)}`
                        : `/?mode=login&profile=${encodeURIComponent(profile.username)}&returnTo=${encodeURIComponent(returnTo)}`
                    }
                    className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3 text-left hover:border-cyan-300/60"
                  >
                    <Image
                      src={profile.avatarFullUrl ?? "/app-logo.png"}
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-md object-cover"
                    />
                    <span>
                      <span className="block font-semibold text-white">
                        {profile.displayName}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {profile.username}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="mx-auto mt-8 grid max-w-xs gap-3">
              <Link
                href={`/?mode=register&returnTo=${encodeURIComponent(returnTo)}`}
                className={buttonClassName()}
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create Account
              </Link>
              <Link
                href={`/?mode=login&returnTo=${encodeURIComponent(returnTo)}`}
                className={buttonClassName({ variant: "secondary" })}
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Login
              </Link>
            </div>
          </div>
        ) : null}

        {params.error ? (
          <p className="mt-4 rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
            {params.error === "database"
              ? "Database is not running. Start PostgreSQL and run migrations, then try again."
              : "Login failed, or the username is already registered."}
          </p>
        ) : null}

        {mode === "login" ? (
          <form action="/local-login" method="post" className="mt-6 space-y-4">
            <input type="hidden" name="action" value="login" />
            <input type="hidden" name="returnTo" value={returnTo} />
            {selectedProfile ? (
              <input
                type="hidden"
                name="username"
                value={selectedProfile.username}
              />
            ) : null}
            <h2 className="font-semibold text-white">Login</h2>
            {selectedProfile ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3">
                <Image
                  src={selectedProfile.avatarFullUrl ?? "/app-logo.png"}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-md object-cover"
                />
                <div>
                  <p className="font-semibold text-white">
                    {selectedProfile.displayName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedProfile.username}
                  </p>
                </div>
              </div>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-slate-200">
                  Username
                </span>
                <Input
                  name="username"
                  required
                  minLength={3}
                  className="mt-2"
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Password
              </span>
              <Input
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-2"
              />
            </label>
            <button className={buttonClassName({ className: "w-full" })}>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Login
            </button>
            <Link
              href="/"
              className="block text-center text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
            >
              Back
            </Link>
          </form>
        ) : null}

        {mode === "register" ? (
          <form action="/local-login" method="post" className="mt-6 space-y-4">
            <input type="hidden" name="action" value="register" />
            <input type="hidden" name="returnTo" value={returnTo} />
            <h2 className="font-semibold text-white">Create Account</h2>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Username
              </span>
              <Input name="username" required minLength={3} className="mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Password
              </span>
              <Input
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Confirm Password
              </span>
              <Input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                className="mt-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Steam API key
              </span>
              <Input
                name="steamApiKey"
                type="password"
                autoComplete="off"
                required
                minLength={32}
                maxLength={32}
                pattern="[A-Fa-f0-9]{32}"
                className="mt-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Steam64ID
              </span>
              <Input
                name="steamId"
                inputMode="numeric"
                required
                minLength={17}
                maxLength={17}
                pattern="\d{17}"
                className="mt-2"
              />
            </label>
            <button className={buttonClassName({ className: "w-full" })}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Register
            </button>
            <Link
              href="/"
              className="block text-center text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
            >
              Back
            </Link>
          </form>
        ) : null}

        {mode === "register" ? (
          <div className="mt-4 grid gap-2">
            <a
              href="https://steamcommunity.com/dev/apikey"
              className="text-sm text-cyan-300 underline-offset-4 hover:underline"
            >
              Get a Steam API key
            </a>
            <a
              href="https://steamid.io/"
              className="text-sm text-cyan-300 underline-offset-4 hover:underline"
            >
              Get Steam64ID
            </a>
          </div>
        ) : null}
      </section>
    </main>
  );
}
