function appendSubstackFeedForRoot(url: string): string {
  try {
    const parsed = new URL(url)
    if (/(^|\.)substack\.com$/i.test(parsed.hostname) && (parsed.pathname === '' || parsed.pathname === '/')) {
      parsed.pathname = '/feed'
    }
    return parsed.toString()
  } catch {
    return url
  }
}

export function normalizeFeedInput(input: string): string {
  const trimmed = input.trim()

  if (/^https?:\/\//i.test(trimmed)) {
    return appendSubstackFeedForRoot(trimmed)
  }

  if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.substack\.com(?:\/.*)?$/i.test(trimmed)) {
    return appendSubstackFeedForRoot(`https://${trimmed}`)
  }

  if (/^[a-z0-9-]+$/i.test(trimmed)) {
    return `https://${trimmed.toLowerCase()}.substack.com/feed`
  }

  if (/^[^\s/]+\.[^\s/]+(?:\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`
  }

  return trimmed
}
