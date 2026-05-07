// Tiny markdown → HTML renderer for the admin preview email.
// Not a full spec implementation — covers the subset Gemini emits per our
// prompt: H1/H2/H3, bold/italic, links, ordered/unordered lists, blockquotes,
// horizontal rules, and paragraphs. No tables, no code blocks (prompt forbids).

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(text: string): string {
  let out = escapeHtml(text)
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, label, url) =>
      `<a href="${url}" style="color:#2e7ef6;text-decoration:underline;">${label}</a>`,
  )
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  return out
}

export function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/)
  const out: string[] = []
  let i = 0

  const flushList = (tag: 'ul' | 'ol', items: string[]) => {
    out.push(`<${tag} style="margin:0 0 16px 24px;color:#101016;line-height:1.6;">`)
    for (const it of items) out.push(`<li style="margin-bottom:6px;">${renderInline(it)}</li>`)
    out.push(`</${tag}>`)
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }
    if (/^---+$/.test(trimmed)) {
      out.push('<hr style="border:none;border-top:1px solid rgba(16,16,22,0.1);margin:24px 0;" />')
      i++
      continue
    }
    const h = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (h) {
      const level = h[1].length
      const sizes = { 1: '24px', 2: '20px', 3: '17px' } as const
      out.push(
        `<h${level} style="font-family:'Space Grotesk','Inter',sans-serif;color:#101016;font-size:${sizes[level as 1 | 2 | 3]};margin:24px 0 12px;letter-spacing:-0.01em;">${renderInline(h[2])}</h${level}>`,
      )
      i++
      continue
    }
    if (/^>\s/.test(trimmed)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      out.push(
        `<blockquote style="border-left:3px solid #2e7ef6;padding:8px 16px;margin:16px 0;color:#5a5a64;font-style:italic;background:#fbfbfe;">${renderInline(buf.join(' '))}</blockquote>`,
      )
      continue
    }
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      flushList('ul', items)
      continue
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      flushList('ol', items)
      continue
    }
    const buf: string[] = [trimmed]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s|>\s|---+$|[-*]\s|\d+\.\s)/.test(lines[i].trim())
    ) {
      buf.push(lines[i].trim())
      i++
    }
    out.push(
      `<p style="margin:0 0 16px;color:#101016;font-size:16px;line-height:1.7;">${renderInline(buf.join(' '))}</p>`,
    )
  }

  return out.join('\n')
}
