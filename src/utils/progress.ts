export interface QuizResult {
  score: number;
  total: number;
  topic: string;
}

export function calculateProgressPercentage(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

export function calculateCompositeProgress(
  topicsCompleted: number,
  totalTopics: number,
  quizzesPassed: number,
  totalQuizzes: number
): number {
  const topicPct = calculateProgressPercentage(topicsCompleted, totalTopics);
  const quizPct = calculateProgressPercentage(quizzesPassed, totalQuizzes);
  // 60% topics + 40% quizzes
  return Math.round(topicPct * 0.6 + quizPct * 0.4);
}

export function diagnoseWeakAreas(results: QuizResult[]): string[] {
  const map = new Map<string, { scored: number; total: number }>();
  for (const r of results) {
    const existing = map.get(r.topic) || { scored: 0, total: 0 };
    map.set(r.topic, {
      scored: existing.scored + r.score,
      total: existing.total + r.total,
    });
  }

  const weak: string[] = [];
  for (const [topic, data] of map.entries()) {
    if (data.total > 0 && data.scored / data.total < 0.75) {
      weak.push(topic);
    }
  }
  return weak;
}

export function formatIndianCurrencyLakhs(amountLakhs: number): string {
  return `₹${amountLakhs}L+`;
}
