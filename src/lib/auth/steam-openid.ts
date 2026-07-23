import { env } from "@/config/env";
import { AppError } from "@/lib/errors";

const steamOpenIdUrl = "https://steamcommunity.com/openid/login";
const identifier = "http://specs.openid.net/auth/2.0/identifier_select";

export function steamLoginUrl(returnTo: string) {
  const callback = new URL("/auth/steam/callback", env.APP_URL);
  callback.searchParams.set("returnTo", returnTo);

  const url = new URL(steamOpenIdUrl);
  url.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0");
  url.searchParams.set("openid.mode", "checkid_setup");
  url.searchParams.set("openid.return_to", callback.toString());
  url.searchParams.set("openid.realm", env.APP_URL);
  url.searchParams.set("openid.identity", identifier);
  url.searchParams.set("openid.claimed_id", identifier);
  return url;
}

export async function verifySteamOpenIdCallback(callbackUrl: URL) {
  const body = new URLSearchParams(callbackUrl.searchParams);
  body.set("openid.mode", "check_authentication");

  const response = await fetch(steamOpenIdUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new AppError(
      "AUTH_FAILED",
      "Steam sign-in verification failed.",
      401,
    );
  }

  const text = await response.text();
  if (!text.includes("is_valid:true")) {
    throw new AppError(
      "AUTH_FAILED",
      "Steam did not validate this sign-in.",
      401,
    );
  }

  const claimedId = callbackUrl.searchParams.get("openid.claimed_id");
  const steamId = claimedId?.match(/\/id\/(\d+)$/)?.[1];
  if (!steamId) {
    throw new AppError(
      "AUTH_FAILED",
      "Steam response did not include a SteamID.",
      401,
    );
  }
  return steamId;
}
