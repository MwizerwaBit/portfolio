import { useEffect } from 'react'

const SITE = 'MwizerwaBit'
const TAGLINE = 'Full-stack SaaS engineer'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) {
    if (el) el.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!href) {
    if (el) el.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** Canonical URL for the current route: origin + pathname, no query or hash. */
function canonicalUrl() {
  const { origin, pathname } = window.location
  return origin + (pathname === '/' ? '/' : pathname.replace(/\/+$/, ''))
}

/**
 * Set the document title, meta description, canonical, Open Graph and Twitter
 * card tags for the current page. Keeps the tab title, SEO tags and social
 * previews correct without a router plugin. Pass `type: 'article'` and an
 * `image` URL to emit richer cards for blog posts.
 */
export default function useSeo({ title, description, type = 'website', image }) {
  useEffect(() => {
    const full = title ? `${title} — ${SITE}` : `${SITE} — ${TAGLINE}`
    const url = canonicalUrl()

    document.title = full
    setMeta('name', 'description', description)
    setLink('canonical', url)

    setMeta('property', 'og:title', full)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:site_name', SITE)
    setMeta('property', 'og:image', image)

    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    setMeta('name', 'twitter:title', full)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', image)
  }, [title, description, type, image])
}
