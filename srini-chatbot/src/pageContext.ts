export type PageContext = { page_path?: string; page_title?: string }

/**
 * Best-effort context about the host page the chat is embedded on.
 * Priority: explicit `?page`/`?title` query params (set by the host shell),
 * then a same-origin read of the parent document.
 */
export function getPageContext(): PageContext {
  const ctx: PageContext = {}
  try {
    const q = new URLSearchParams(window.location.search)
    const qp = q.get('page')
    const qt = q.get('title')
    if (qp) ctx.page_path = qp
    if (qt) ctx.page_title = qt
  } catch {
    /* ignore malformed query string */
  }
  try {
    if (window.parent && window.parent !== window) {
      if (!ctx.page_path) {
        const loc = window.parent.location
        ctx.page_path = loc.pathname + loc.search
      }
      if (!ctx.page_title) ctx.page_title = window.parent.document.title
    }
  } catch {
    /* cross-origin parent: rely on query params */
  }
  return ctx
}

export function normalizePagePath(path?: string): string {
  if (!path) return ''
  const base = path.split('?')[0].toLowerCase()
  const name = base.split('/').filter(Boolean).pop() || ''
  return name.replace(/\.html$/, '')
}
