/**
 * Links in anonymous comments and free-text answers.
 * Matches explicit URLs, www hosts, markdown links, and bare hostnames with a public suffix.
 * `node.js` and version numbers do not match: `.js` is not in the suffix list.
 */
const LINK =
  /(?:(?:h(?:tt|xx)p|ftp)s?:\/\/|www\.)\S+|\[[^\]]*\]\([^)]*\)|\b[a-z0-9][a-z0-9-]{0,62}\.(?:com|net|org|io|dev|ai|kr|app|co|me|xyz|gg|sh|so|link)\b/i;

export function containsLink(value: string): boolean {
  return LINK.test(value);
}
