import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Article cards/rows under `partialPrefetching`: default Link prefetch is the App Shell only, so
 * `/a/[slug]` content would wait until click. Force full prefetch (same idea as CategoryNavLink).
 */
export function ArticleNavLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} prefetch={true} />;
}
