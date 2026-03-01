export type MatchSource = 'topik' | 'custom'
export type MatchConfidence = 'exact' | 'derived'

export interface DictionaryWord {
  id: number
  korean: string
}

export interface AnalyzeVocabularyInput {
  text: string
  topikWords: DictionaryWord[]
  customWords: DictionaryWord[]
}

export interface VocabularyMatch {
  source: MatchSource
  wordId: number
  surfaceForm: string
  normalizedForm: string
  baseForm: string
  matchConfidence: MatchConfidence
}

const STRIP_SUFFIXES = [
  '이었다',
  '였다',
  '했다',
  '으로',
  '에서',
  '에게',
  '까지',
  '부터',
  '처럼',
  '은',
  '는',
  '이',
  '가',
  '을',
  '를',
  '에',
  '와',
  '과',
  '도',
  '만',
  '로',
  '의',
].sort((a, b) => b.length - a.length)

function normalizeToken(value: string): string {
  return value.normalize('NFC').trim()
}

function deriveCandidates(token: string): string[] {
  const seen = new Set<string>([token])
  const queue = [token]

  for (let i = 0; i < 2; i += 1) {
    const current = queue[i]
    if (!current) break

    for (const suffix of STRIP_SUFFIXES) {
      if (!current.endsWith(suffix)) continue

      const stem = current.slice(0, -suffix.length)
      if (!/^[가-힣]{2,}$/.test(stem) || seen.has(stem)) continue

      seen.add(stem)
      queue.push(stem)
    }
  }

  return queue
}

function tokenize(text: string): string[] {
  return text.match(/[가-힣]+/g) ?? []
}

function tryMatch(
  candidates: string[],
  index: Map<string, DictionaryWord>,
  source: MatchSource,
  surfaceForm: string,
  normalizedForm: string
): VocabularyMatch | null {
  for (const candidate of candidates) {
    const match = index.get(candidate)
    if (!match) continue

    return {
      source,
      wordId: match.id,
      surfaceForm,
      normalizedForm,
      baseForm: candidate,
      matchConfidence: candidate === normalizedForm ? 'exact' : 'derived',
    }
  }

  return null
}

export function analyzeVocabulary(input: AnalyzeVocabularyInput): VocabularyMatch[] {
  const topikIndex = new Map(input.topikWords.map(word => [normalizeToken(word.korean), word]))
  const customIndex = new Map(input.customWords.map(word => [normalizeToken(word.korean), word]))

  const results: VocabularyMatch[] = []
  const dedupe = new Set<string>()

  for (const token of tokenize(input.text)) {
    const normalized = normalizeToken(token)
    const candidates = deriveCandidates(normalized)

    const topikMatch = tryMatch(candidates, topikIndex, 'topik', token, normalized)
    if (topikMatch) {
      const key = `${topikMatch.source}:${topikMatch.wordId}`
      if (!dedupe.has(key)) {
        dedupe.add(key)
        results.push(topikMatch)
      }
      continue
    }

    const customMatch = tryMatch(candidates, customIndex, 'custom', token, normalized)
    if (customMatch) {
      const key = `${customMatch.source}:${customMatch.wordId}`
      if (!dedupe.has(key)) {
        dedupe.add(key)
        results.push(customMatch)
      }
    }
  }

  return results
}
