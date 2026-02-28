export function calculateQuizScore(correct: number, wrong: number): number {
  return correct - wrong
}

export function calculateTotalScore(wordQuizScore: number, comprehensionScore: number): number {
  return wordQuizScore + comprehensionScore
}
