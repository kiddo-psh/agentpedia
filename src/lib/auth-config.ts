/** Which sign-in methods exist. Kept free of DB imports so static pages can read it. */

export const githubCredentials =
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET }
    : undefined;

export const githubLogin = Boolean(githubCredentials);

/**
 * Email/password exists only so local dev works without a GitHub OAuth app.
 * It is never enabled in production builds.
 */
export const devPasswordLogin = process.env.NODE_ENV !== "production" && !githubLogin;
