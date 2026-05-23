import { sanitizeContactEmail } from './sanitizeContactEmail'

const PLACEHOLDER = '\x00PH'

function protect(text: string, store: string[], regex: RegExp): string {
  return text.replace(regex, (match) => {
    store.push(match)
    return `${PLACEHOLDER}${store.length - 1}${PLACEHOLDER}`
  })
}

function restore(text: string, store: string[]): string {
  return text.replace(new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, 'g'), (_, i) => store[Number(i)])
}

function toTelHref(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `tel:+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `tel:+${digits}`
  return `tel:+${digits}`
}

function toHttpsHref(match: string): string {
  return /^https?:\/\//i.test(match) ? match : `https://${match}`
}

/** Turn plain emails, phone numbers, and URLs into GFM links for the chat UI. */
export function linkifyBotMarkdown(source: string): string {
  const protectedBlocks: string[] = []
  let text = source

  text = protect(text, protectedBlocks, /```[\s\S]*?```/g)
  text = protect(text, protectedBlocks, /`[^`\n]+`/g)
  text = protect(text, protectedBlocks, /\[([^\]]*)\]\(([^)]+)\)/g)

  text = text.replace(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, '[$1](mailto:$1)')

  text = text.replace(/\b(https?:\/\/[^\s<>[\]()]+[^\s<>[\]().,;:!?'"])/gi, (match) => {
    const href = toHttpsHref(match)
    return `[${match}](${href})`
  })

  text = text.replace(
    /\b((?:www\.)?(?:linkedin\.com|github\.com|twitter\.com|x\.com|medium\.com|srini93\.github\.io)[^\s<>[\](),]*|(?:www\.)?[a-z0-9][-a-z0-9]*(?:\.[a-z0-9][-a-z0-9]*)+\/[^\s<>[\](),.]+)/gi,
    (match, _m, offset, full) => {
      const before = full.slice(Math.max(0, offset - 12), offset)
      if (before.includes('@') || before.includes('://')) return match
      const href = /^https?:\/\//i.test(match) ? match : `https://${match}`
      return `[${match}](${href})`
    },
  )

  text = text.replace(
    /(?<![\d@])(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g,
    (match) => `[${match}](${toTelHref(match)})`,
  )

  return restore(text, protectedBlocks)
}

export { sanitizeContactEmail } from './sanitizeContactEmail'

export function prepareBotMarkdown(source: string): string {
  return linkifyBotMarkdown(sanitizeContactEmail(source))
}
