import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic()
  }
  return _client
}

function coerceTopikLevel(value: unknown): 1 | 2 | 3 | 4 | 5 | 6 {
  const level = Number(value)
  if ([1, 2, 3, 4, 5, 6].includes(level)) {
    return level as 1 | 2 | 3 | 4 | 5 | 6
  }
  return 3
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let korean: string
  try {
    const body = await req.json()
    korean = body.korean?.trim()
    if (!korean) {
      return NextResponse.json({ error: 'Missing "korean" field' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const message = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Define this Korean word concisely. Return ONLY valid JSON, no markdown fences.

Word: ${korean}

Return format:
{"english": "concise English definition", "romanization": "romanized pronunciation", "topikLevel": 1}

Rules:
- english: 1-6 word definition, the most common meaning
- romanization: standard romanization (e.g. "gyeongje" for 경제)
- topikLevel: integer 1-6 estimate of this word's TOPIK difficulty level
- If it's a grammatical particle (은, 는, 이, 가, 을, 를, 에, 에서, 도, 의), define it as a particle with its grammatical function
- If it's an inflected verb form, define the base form`,
        },
        {
          role: 'assistant',
          content: '{',
        },
      ],
    })

    const block = message.content[0]
    if (!block || block.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected Claude response' }, { status: 500 })
    }

    // Reconstruct full JSON (we prefilled with '{')
    const raw = '{' + block.text
    const cleaned = raw
      .replace(/^\uFEFF/, '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')

    const parsed = JSON.parse(cleaned)
    return NextResponse.json({
      korean,
      english: parsed.english,
      romanization: parsed.romanization,
      topikLevel: coerceTopikLevel(parsed.topikLevel),
    })
  } catch (err) {
    console.error('[words/lookup] Claude lookup failed:', err)
    return NextResponse.json({ error: 'Definition lookup failed' }, { status: 500 })
  }
}
