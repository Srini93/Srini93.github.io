export const CONTACT_EMAIL = 'tcsreeni93@gmail.com'

const ESCAPED_CONTACT = CONTACT_EMAIL.replace(/\./g, '\\.')

/** Remove wrong @srinivasan.design addresses and dedupe the real contact email. */
export function sanitizeContactEmail(text: string): string {
  let out = text

  out = out.replace(/mailto:[A-Za-z0-9._%+-]+@srinivasan\.design/gi, `mailto:${CONTACT_EMAIL}`)
  out = out.replace(/\[[^\]]*\]\(mailto:[A-Za-z0-9._%+-]+@srinivasan\.design\)/gi, CONTACT_EMAIL)
  out = out.replace(/\b[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\bat\b)\s*srinivasan\.design\b/gi, CONTACT_EMAIL)
  out = out.replace(/\b[A-Za-z0-9._%+-]+@srinivasan\.design\b/gi, CONTACT_EMAIL)

  out = out.replace(
    new RegExp(`${ESCAPED_CONTACT}\\s*(?:,\\s*|\\s+or\\s+|\\s+and\\s+)${ESCAPED_CONTACT}`, 'gi'),
    CONTACT_EMAIL,
  )

  out = out.replace(/contact information:\s*/gi, 'contact email: ')
  out = out.replace(/:\s*,/g, ':')
  out = out.replace(/\(\s*\)/g, '')
  out = out.replace(/\s{2,}/g, ' ')

  return out.trim()
}
