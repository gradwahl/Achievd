import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { sessionSecret } from "@/config/env";

const encryptedSecretSchema = z.object({
  iv: z.string(),
  tag: z.string(),
  encrypted: z.string(),
});

const accountSchema = z.object({
  username: z.string(),
  steamId: z.string(),
  displayAtLogin: z.boolean().default(false),
  autoLoginApiKey: encryptedSecretSchema.optional(),
  salt: z.string(),
  passwordHash: z.string(),
  apiKey: encryptedSecretSchema,
});

const storeSchema = z.object({
  accounts: z.array(accountSchema),
});

type Account = z.infer<typeof accountSchema>;
type Store = z.infer<typeof storeSchema>;

function dataDir() {
  return (
    process.env.ACHIEVEMENT_COMPASS_DATA_DIR ??
    path.join(process.cwd(), ".local-data")
  );
}

function storePath() {
  return path.join(dataDir(), "accounts.json");
}

function key(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 120_000, 32, "sha256");
}

function hashPassword(password: string, salt: string) {
  return key(password, salt).toString("base64url");
}

function encryptSecret(
  value: string,
  password: string,
  salt: string,
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(password, salt), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    encrypted: encrypted.toString("base64url"),
  };
}

function encryptApiKey(apiKey: string, password: string, salt: string) {
  return encryptSecret(apiKey, password, salt);
}

function decryptApiKey(account: Account, password: string) {
  return decryptSecret(account.apiKey, password, account.salt);
}

function decryptSecret(
  secret: z.infer<typeof encryptedSecretSchema>,
  password: string,
  salt: string,
) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(password, salt),
    Buffer.from(secret.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(secret.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(secret.encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function readStore(): Promise<Store> {
  try {
    return storeSchema.parse(JSON.parse(await readFile(storePath(), "utf8")));
  } catch {
    return { accounts: [] };
  }
}

async function writeStore(store: z.infer<typeof storeSchema>) {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2));
}

export async function registerLocalAccount(input: {
  username: string;
  password: string;
  steamId: string;
  steamApiKey: string;
}) {
  const store = await readStore();
  const username = input.username.toLowerCase();
  if (store.accounts.some((account) => account.username === username)) {
    return null;
  }

  const salt = randomBytes(16).toString("base64url");
  const account: Account = {
    username,
    steamId: input.steamId,
    displayAtLogin: false,
    salt,
    passwordHash: hashPassword(input.password, salt),
    apiKey: encryptApiKey(input.steamApiKey, input.password, salt),
  };
  store.accounts.push(account);
  await writeStore(store);
  return {
    steamId: account.steamId,
    steamApiKey: input.steamApiKey,
    username: account.username,
  };
}

export async function loginLocalAccount(username: string, password: string) {
  const store = await readStore();
  const account = store.accounts.find(
    (item) => item.username === username.toLowerCase(),
  );
  if (
    !account ||
    account.passwordHash !== hashPassword(password, account.salt)
  ) {
    return null;
  }
  return {
    steamId: account.steamId,
    steamApiKey: decryptApiKey(account, password),
    username: account.username,
  };
}

export async function loginSavedLocalAccount(username: string) {
  const store = await readStore();
  const account = store.accounts.find(
    (item) => item.username === username.toLowerCase(),
  );
  if (!account?.autoLoginApiKey) return null;
  return {
    steamId: account.steamId,
    steamApiKey: decryptSecret(
      account.autoLoginApiKey,
      sessionSecret,
      account.salt,
    ),
    username: account.username,
  };
}

export async function setLocalAccountLoginOptions(
  username: string,
  options: { displayAtLogin?: boolean; autoLogin?: boolean; steamApiKey?: string },
) {
  const store = await readStore();
  const account = store.accounts.find(
    (item) => item.username === username.toLowerCase(),
  );
  if (!account) return false;
  if (options.displayAtLogin !== undefined) {
    account.displayAtLogin = options.displayAtLogin;
  }
  if (options.autoLogin !== undefined) {
    account.autoLoginApiKey =
      options.autoLogin && options.steamApiKey
        ? encryptSecret(options.steamApiKey, sessionSecret, account.salt)
        : undefined;
  }
  if (!account.displayAtLogin) account.autoLoginApiKey = undefined;
  await writeStore(store);
  return true;
}

export async function getLocalAccountLoginOptions(username?: string) {
  if (!username) return { displayAtLogin: false, autoLogin: false };
  const store = await readStore();
  const account = store.accounts.find(
    (item) => item.username === username.toLowerCase(),
  );
  return {
    displayAtLogin: Boolean(account?.displayAtLogin),
    autoLogin: Boolean(account?.autoLoginApiKey),
  };
}

export async function listDisplayLoginProfiles() {
  const store = await readStore();
  return Promise.all(
    store.accounts
      .filter((account) => account.displayAtLogin)
      .map(async (account) => {
        let displayName = account.username;
        let avatarFullUrl: string | undefined;
        try {
          const state = JSON.parse(
            await readFile(
              path.join(dataDir(), `steam-state-${account.steamId}.json`),
              "utf8",
            ),
          ) as { profile?: { displayName?: string; avatarFullUrl?: string } };
          displayName = state.profile?.displayName ?? displayName;
          avatarFullUrl = state.profile?.avatarFullUrl;
        } catch {}

        return {
          username: account.username,
          steamId: account.steamId,
          displayName,
          avatarFullUrl,
          autoLogin: Boolean(account.autoLoginApiKey),
        };
      }),
  );
}
