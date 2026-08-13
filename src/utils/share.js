const SHARE_PATH = /^\/s\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i

export function getShareIdFromLocation(location = window.location) {
  const match = location.pathname.match(SHARE_PATH)
  if (match) return match[1]
  return new URLSearchParams(location.search).get('s')
}

export function buildShareUrl(shareId) {
  return `${window.location.origin}/s/${shareId}`
}

export function goHomePath() {
  window.history.pushState({}, '', '/')
}

export function goSharePath(shareId) {
  const next = `/s/${shareId}`
  if (window.location.pathname !== next) {
    window.history.replaceState({}, '', next)
  }
}

export async function shareOrCopy({ title, text, url }) {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }

  await navigator.clipboard.writeText(url)
  return 'copied'
}
