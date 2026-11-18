import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Category and index tabs under `partialPrefetching`: the default Link prefetch is the App Shell
 * only, so params-dependent `/c/[category]` content would wait until click. Force full prefetch.
 * docs/sidebar-tab-switch-perf.md
 */
export function CategoryNavLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} prefetch={true} />;
}
