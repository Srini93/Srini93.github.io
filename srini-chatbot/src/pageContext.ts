export type PageContext = {
  page_path?: string
  page_title?: string
  page_content?: string
  page_section?: string
}

const HOST_PAGE_HOSTS = /^(www\.)?srinivasan\.design$|^localhost$|^127\.0\.0\.1$/
const PAGE_TEXT_LIMIT = 6000
const SECTION_TEXT_LIMIT = 1500
const PAGE_BLOCKS = 'h1,h2,h3,h4,p,li,blockquote,figcaption,dt,dd,td'
// Hidden tab panels (like AI Labs) still count as page content; only what is
// on screen counts as the section in view.
const PAGE_SKIP =
  'script,style,noscript,svg,nav,footer,iframe,form,dialog,template,' +
  '#chatbot-sidebar,.chatbot-sidebar,[aria-hidden="true"]'

function hostDocument(): Document | null {
  try {
    if (window.parent === window) return null
    const doc = window.parent.document
    if (!HOST_PAGE_HOSTS.test(window.parent.location.hostname)) return null
    return doc
  } catch {
    return null
  }
}

/** Short items that are just a link (menus, social icons) aren't page content. */
function isLinkOnly(el: Element, text: string): boolean {
  if (text.length > 40) return false
  const link = el.querySelector('a')
  return !!link && (link.textContent || '').replace(/\s+/g, ' ').trim() === text
}

/**
 * Live text of the portfolio page hosting this iframe. Only works when the
 * chatbot is served from the same origin as the page (srinivasan.design/chatbot/).
 */
export function readHostPage(): { content: string; section: string } | null {
  const doc = hostDocument()
  if (!doc?.body) return null
  const root = doc.querySelector('main, [role="main"]') || doc.body
  const viewportHeight = doc.defaultView?.innerHeight || 800
  const lines: string[] = []
  const visible: string[] = []
  const seen = new Set<string>()
  let length = 0

  for (const el of root.querySelectorAll(PAGE_BLOCKS)) {
    if (length >= PAGE_TEXT_LIMIT) break
    if (el.closest(PAGE_SKIP)) continue
    if (el.parentElement?.closest('p,li,blockquote,figcaption,dd,td')) continue
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
    if (!text || seen.has(text) || isLinkOnly(el, text)) continue
    seen.add(text)
    const line = /^H[1-4]$/.test(el.tagName)
      ? `\n## ${text}`
      : el.tagName === 'LI'
        ? `- ${text}`
        : text
    lines.push(line)
    length += line.length + 1
    const rect = el.getBoundingClientRect()
    if (rect.bottom > 0 && rect.top < viewportHeight) visible.push(line)
  }

  if (!lines.length) return null
  return {
    content: lines.join('\n').trim().slice(0, PAGE_TEXT_LIMIT),
    section: visible.join('\n').trim().slice(0, SECTION_TEXT_LIMIT),
  }
}

/**
 * Best-effort context about the host page the chat is embedded on.
 * Priority: explicit `?page`/`?title` query params (set by the host shell),
 * then a same-origin read of the parent document, including live page text
 * (Proxy 1.0.0-beta.2) when the iframe shares origin with the portfolio.
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

  const page = readHostPage()
  if (page) {
    ctx.page_content = page.content
    if (page.section) ctx.page_section = page.section
  }

  return ctx
}

export function normalizePagePath(path?: string): string {
  if (!path) return ''
  const base = path.split('?')[0].toLowerCase()
  const name = base.split('/').filter(Boolean).pop() || ''
  return name.replace(/\.html$/, '')
}
