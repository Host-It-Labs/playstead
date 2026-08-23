const ROUND_DIFFICULTY_LABELS = ['Easy', 'Familiar', 'Tricky', 'Hard', 'Expert'] as const;

export function roundDifficultyLabel(round: number): string {
  return ROUND_DIFFICULTY_LABELS[Math.min(ROUND_DIFFICULTY_LABELS.length - 1, round - 1)] ?? 'Easy';
}
