export function normalizeMarkdown(text) {
  if (!text) return ''
  return text.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
}

/** 비회원에게 보여줄 앞부분. 문단/줄 끊기는 곳에서 자른다. */
export function getPreviewText(text, ratio = 0.5) {
  if (!text) return ''
  const target = Math.max(180, Math.floor(text.length * ratio))
  if (text.length <= target) return text

  const slice = text.slice(0, target)
  const breakAt = Math.max(
    slice.lastIndexOf('\n\n'),
    slice.lastIndexOf('\n'),
    slice.lastIndexOf('. '),
    slice.lastIndexOf('요.'),
  )

  const cut = breakAt > target * 0.35 ? slice.slice(0, breakAt) : slice
  return cut.trimEnd()
}
