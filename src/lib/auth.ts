import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { devPasswordLogin, githubCredentials } from "./auth-config";

export const auth = betterAuth({
  database: drizzleAdapter(await getDb(), { provider: "pg", schema }),
  socialProviders: githubCredentials ? { github: githubCredentials } : {},
  emailAndPassword: { enabled: devPasswordLogin },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
