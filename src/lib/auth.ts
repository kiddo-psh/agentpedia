import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb, type Db } from "@/db/client";
import * as schema from "@/db/schema";
import { devPasswordLogin, githubCredentials } from "./auth-config";

function createAuth(db: Db) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    socialProviders: githubCredentials ? { github: githubCredentials } : {},
    emailAndPassword: { enabled: devPasswordLogin },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];

/**
 * Built on first use, not at import: build workers and route analysis import this
 * module, and must not open the database.
 */
let auth: Promise<Auth> | undefined;
export function getAuth(): Promise<Auth> {
  // Like getDb: do not cache a failure, or one bad start disables auth until restart.
  auth ??= getDb()
    .then(createAuth)
    .catch((err) => {
      auth = undefined;
      throw err;
    });
  return auth;
}

export async function getSession(headers: Headers): Promise<Session | null> {
  return (await getAuth()).api.getSession({ headers });
}
