import { TopikLevel } from './constants'

export type ArticleStatus = 'unread' | 'reading' | 'completed'

// Segment types stored in adapted_korean JSONB column
export type Segment =
  | { type: 'text'; text: string }
  | { type: 'word'; text: string; wordId: number; topikLevel: TopikLevel }
  | { type: 'break' }

export interface ComprehensionQuestion {
  id: string
  question: string
  options: [string, string, string, string]
  correct: number  // 0-3 index
  userAnswer?: number
}

export interface Article {
  id: string
  user_id: string
  source_url: string
  title: string
  adapted_korean: Segment[]
  original_english: string
  topik_level_at_time: TopikLevel
  status: ArticleStatus
  word_quiz_score: number
  comprehension_score: number
  total_score: number
  comprehension_questions: ComprehensionQuestion[]
  created_at: string
  completed_at: string | null
}

export interface TopikWord {
  id: number
  korean: string
  english: string
  romanization: string
  topik_level: TopikLevel
}

export interface UserWordMastery {
  word_id: number
  mastery: number
  times_correct: number
  times_seen: number
}

export interface UserSettings {
  user_id: string
  topik_level: TopikLevel
}
