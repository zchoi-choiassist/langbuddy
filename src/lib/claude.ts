import Anthropic from '@anthropic-ai/sdk'
import type { TopikLevel } from './constants'
import type { Segment, ComprehensionQuestion } from './types'

// Lazy-initialized so module import doesn't throw in test environments
// (Anthropic SDK throws if it detects a browser-like environment at construction time)
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic()
  }
  return _client
}

export interface AdaptationResponse {
  adaptedKorean: Segment[]
  comprehensionQuestions: ComprehensionQuestion[]
}

// System prompt cached with ephemeral cache_control (~12K tokens).
// Includes TOPIK vocabulary reference so Claude can emit correct wordIds.
const SYSTEM_PROMPT = `You are a Korean language learning assistant. Adapt articles for Korean learners at a specified TOPIK level.

## TOPIK Vocabulary Reference
### Level 1 (~800 words — absolute beginner, daily basics)
가다, 가족, 감사합니다, 공부, 나라, 날씨, 내일, 먹다, 물, 사람, 사랑, 시간, 안녕하세요, 어디, 언제, 오늘, 음식, 이름, 있다, 좋다, 친구, 학교, 하다

### Level 2 (~700 words — elementary, everyday topics)
경험, 경제, 관계, 교육, 문화, 사회, 성공, 여행, 인기, 직업, 환경

### Level 3 (~600 words — intermediate-low, general topics)
결과, 계획, 공통, 관심, 국제, 기술, 내용, 대화, 문제, 방법, 비교, 사실, 상황, 역할, 이유, 자료, 정보, 조건, 주제, 차이

### Level 4 (~500 words — intermediate-high, news topics)
강조, 개선, 근거, 논의, 대응, 발전, 변화, 분석, 사례, 영향, 원인, 의미, 전략, 주장, 평가

### Level 5 (~400 words — advanced-low, abstract topics)
가치, 개념, 구조, 논리, 맥락, 범위, 본질, 상징, 원리, 이론, 체계, 추상, 패러다임, 현상

### Level 6 (~300 words — advanced, near-native)
귀납, 연역, 인식론, 존재론, 형이상학, 형이하학

## Output Format
Return ONLY valid JSON, no markdown fences, no explanation:

{
  "adaptedKorean": [
    { "type": "text", "text": "plain text here" },
    { "type": "word", "text": "경제적", "wordId": 42, "topikLevel": 2 },
    { "type": "break" }
  ],
  "comprehensionQuestions": [
    { "id": "q1", "question": "...", "options": ["option A", "option B", "option C", "option D"], "correct": 0 }
  ]
}

## Rules
- Emit a "break" segment between paragraphs (not inside sentences)
- Tag inflected forms with the base word's ID: 경제적 → wordId for 경제, topikLevel 2
- "correct" in comprehensionQuestions is a 0-based index into options[]
- Only tag words that appear in the TOPIK reference above`

export function buildUserMessage(content: string, topikLevel: TopikLevel): string {
  const challengeLevel = Math.min(topikLevel + 1, 6)
  return `User's TOPIK ${topikLevel}

Adapt this article into Korean at TOPIK ${topikLevel}:

${content}

Adaptation rules:
1. Rewrite in natural Korean — do not translate sentence-by-sentence
2. Use ~90% vocabulary at or below TOPIK ${topikLevel}
3. Include ~10% vocabulary at TOPIK ${challengeLevel} for challenge
4. For every TOPIK word that appears, emit a "word" segment with its wordId and topikLevel
5. Use "break" segments between paragraphs
6. Generate exactly 3 comprehension questions`
}

export function parseAdaptationResponse(text: string): AdaptationResponse {
  let parsed: AdaptationResponse
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Claude returned invalid JSON')
  }

  if (!Array.isArray(parsed.adaptedKorean)) {
    throw new Error('Response must include an adaptedKorean array')
  }

  if (!Array.isArray(parsed.comprehensionQuestions) || parsed.comprehensionQuestions.length < 3) {
    throw new Error('Response must include at least 3 comprehension questions')
  }

  return parsed
}

export async function adaptArticle(
  title: string,
  content: string,
  topikLevel: TopikLevel
): Promise<AdaptationResponse> {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [
      {
        type: 'text' as const,
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Title: ${title}\n\n${buildUserMessage(content, topikLevel)}`,
      },
    ],
  })

  const block = message.content[0]
  if (!block || block.type !== 'text') {
    throw new Error(`Unexpected Claude response content type: ${block?.type}`)
  }
  return parseAdaptationResponse(block.text)
}
