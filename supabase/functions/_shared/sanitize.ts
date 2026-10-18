import sanitizeHtml from 'npm:sanitize-html@2.18.0'

// FAQ answers are HTML (from Gemini or the admin toolbar) and the public FAQ
// page renders them with innerHTML, so strip everything outside the tag set
// the generate-faq-draft prompt allows. Run on every write path and before
// rendering stored answers in HTML responses/emails.
export const FAQ_HTML_OPTIONS = {
  allowedTags: ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h3'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
}

export function sanitizeFaqHtml(html: string | null | undefined): string {
  return sanitizeHtml(html ?? '', FAQ_HTML_OPTIONS)
}
