import { useMemo } from 'react'
import { marked } from 'marked'

// Dependency-free syntax highlighting for fenced code blocks. A single
// alternation scans left-to-right so tokens are never double-matched; the
// order (string → comment → number → keyword → function) resolves overlaps.

const KEYWORDS = [
  'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import',
  'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'pass', 'break',
  'continue', 'raise', 'yield', 'async', 'await', 'in', 'not', 'and', 'or',
  'is', 'None', 'True', 'False', 'self', 'const', 'let', 'var', 'function',
  'new', 'typeof', 'export', 'default', 'this', 'null', 'undefined',
].sort((a, b) => b.length - a.length)

const STRING = String.raw`"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'`
const COMMENT = String.raw`//[^\n]*|#[^\n]*`
const NUMBER = String.raw`\b\d+(?:\.\d+)?\b`
const KEYWORD = String.raw`\b(?:${KEYWORDS.join('|')})\b`
const FUNCTION = String.raw`[A-Za-z_][A-Za-z0-9_]*(?=\()`

const TOKEN_RE = new RegExp(
  `(${STRING})|(${COMMENT})|(${NUMBER})|(${KEYWORD})|(${FUNCTION})`,
  'g',
)

const HIGHLIGHTABLE = /^(py|python|js|javascript|ts|typescript|tsx|jsx|json|bash|sh|shell|css|html|sql)$/i

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(src) {
  return escapeHtml(src).replace(TOKEN_RE, (m, str, com, num, kw) => {
    if (str) return `<span class="tok-str">${m}</span>`
    if (com) return `<span class="tok-com">${m}</span>`
    if (num) return `<span class="tok-num">${m}</span>`
    if (kw) return `<span class="tok-kw">${m}</span>`
    return `<span class="tok-fn">${m}</span>`
  })
}

// Block executable / risky URL schemes before they ever reach an attribute.
const DANGEROUS_SCHEME = /^(javascript|vbscript):/i
const SAFE_ABSOLUTE = /^(https?|mailto|tel):/i

/** Reject unsafe URLs and URLs with non-http(s) absolute schemes. */
function sanitizeUrl(href, { allowDataImage = false } = {}) {
  const cleaned = (href || '').trim()
  if (!cleaned) return null
  if (DANGEROUS_SCHEME.test(cleaned)) return null
  if (/^data:/i.test(cleaned)) {
    return allowDataImage && /^data:image\//i.test(cleaned) ? cleaned : null
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(cleaned) && !SAFE_ABSOLUTE.test(cleaned)) {
    return null
  }
  return cleaned
}

// Percent-encode the URL (spaces, quotes, etc.) without re-encoding any
// existing percent-sequences — mirrors marked's own cleanUrl.
function encodeUrl(href) {
  try {
    return encodeURI(href).replace(/%25/g, '%')
  } catch {
    return null
  }
}

// Custom renderers for `marked` v12 (positional arguments). The `code`
// renderer highlights fenced blocks; `link`/`image` sanitize URLs, add
// `rel="noopener noreferrer"` to external links, and lazy-load images.
const renderer = {
  code(code, infostring) {
    const lang = ((infostring || '').match(/^\S*/) || [''])[0]
    const inner = HIGHLIGHTABLE.test(lang) ? highlight(code) : escapeHtml(code)
    return `<pre><code class="language-${escapeHtml(lang)}">${inner}</code></pre>`
  },
  link(href, title, text) {
    const safe = sanitizeUrl(href)
    if (!safe) return text
    const encoded = encodeUrl(safe)
    if (encoded === null) return text
    const rel = /^https?:\/\//i.test(encoded) ? ' rel="noopener noreferrer"' : ''
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
    return `<a href="${escapeHtml(encoded)}"${titleAttr}${rel}>${text}</a>`
  },
  image(href, title, text) {
    const safe = sanitizeUrl(href, { allowDataImage: true })
    if (!safe) return escapeHtml(text)
    const encoded = encodeUrl(safe)
    if (encoded === null) return escapeHtml(text)
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
    return `<img src="${escapeHtml(encoded)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" decoding="async">`
  },
}

marked.use({ renderer })

export default function Markdown({ text }) {
  const html = useMemo(() => marked.parse(text || ''), [text])
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
}
