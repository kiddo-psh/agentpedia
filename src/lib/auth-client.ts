"use client";

import { createAuthClient } from "better-auth/client";

/** Vanilla client — no React session hooks. Import only via dynamic `import()` on login/logout. */
export const authClient = createAuthClient();
