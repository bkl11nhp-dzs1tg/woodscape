/**
 * Turns a site-root path like "/assets/x.png" into one that works wherever the
 * game is hosted (the site root, or a sub-folder such as GitHub Pages).
 */
export function withBase(url: string): string {
  return url.startsWith('/') ? `${import.meta.env.BASE_URL}${url.slice(1)}` : url
}
