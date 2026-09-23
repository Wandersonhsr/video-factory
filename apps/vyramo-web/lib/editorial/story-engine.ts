export type NarrativeBeat = {
  id: string;
  startSecond: number;
  endSecond: number;
  purpose:
    | "hook"
    | "context"
    | "evidence"
    | "escalation"
    | "reversal"
    | "payoff"
    | "bridge"
    | "ending";
  novelty: number;
  stakes: number;
  evidenceDensity: number;
  visualChange: number;
  opensLoopIds?: string[];
  resolvesLoopIds?: string[];
};

export type AttentionDebtReport = {
  score: number;
  unresolvedLoops: string[];
  lateLoops: string[];
  flatRuns: Array<{ fromSecond: number; toSecond: number; duration: number }>;
  lowNoveltyBeats: string[];
  recommendations: string[];
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function analyzeAttentionDebt(
  beats: NarrativeBeat[],
  maxLoopAgeSeconds = 150,
  maxFlatSeconds = 45,
): AttentionDebtReport {
  const sorted = [...beats].sort((a, b) => a.startSecond - b.startSecond);
  const opened = new Map<string, number>();
  const resolved = new Set<string>();
  const lateLoops = new Set<string>();
  const lowNoveltyBeats: string[] = [];
  const flatRuns: AttentionDebtReport["flatRuns"] = [];

  let flatStart: number | null = null;
  let flatEnd = 0;

  for (const beat of sorted) {
    for (const loop of beat.opensLoopIds || []) {
      if (!opened.has(loop)) opened.set(loop, beat.startSecond);
    }

    for (const loop of beat.resolvesLoopIds || []) {
      resolved.add(loop);
      const started = opened.get(loop);
      if (started !== undefined && beat.startSecond - started > maxLoopAgeSeconds) {
        lateLoops.add(loop);
      }
    }

    const attentionEnergy =
      clamp(beat.novelty) * 0.4 +
      clamp(beat.stakes) * 0.25 +
      clamp(beat.evidenceDensity) * 0.2 +
      clamp(beat.visualChange) * 0.15;

    if (attentionEnergy < 45) {
      lowNoveltyBeats.push(beat.id);
      if (flatStart === null) flatStart = beat.startSecond;
      flatEnd = beat.endSecond;
    } else if (flatStart !== null) {
      const duration = flatEnd - flatStart;
      if (duration >= maxFlatSeconds) {
        flatRuns.push({
          fromSecond: flatStart,
          toSecond: flatEnd,
          duration,
        });
      }
      flatStart = null;
    }
  }

  if (flatStart !== null) {
    const duration = flatEnd - flatStart;
    if (duration >= maxFlatSeconds) {
      flatRuns.push({
        fromSecond: flatStart,
        toSecond: flatEnd,
        duration,
      });
    }
  }

  const unresolvedLoops = Array.from(opened.keys()).filter(
    (loop) => !resolved.has(loop),
  );

  const deductions =
    unresolvedLoops.length * 10 +
    lateLoops.size * 5 +
    flatRuns.length * 8 +
    Math.min(20, lowNoveltyBeats.length * 2);

  const score = clamp(100 - deductions);
  const recommendations: string[] = [];

  if (unresolvedLoops.length) {
    recommendations.push(
      "Resolver ou remover loops prometidos que não recebem payoff.",
    );
  }
  if (lateLoops.size) {
    recommendations.push(
      "Antecipar payoffs excessivamente distantes ou inserir micro-payoffs intermediários.",
    );
  }
  if (flatRuns.length) {
    recommendations.push(
      "Reescrever trechos planos com nova evidência, contraste, reversão ou escalada real — não efeitos aleatórios.",
    );
  }
  if (lowNoveltyBeats.length) {
    recommendations.push(
      "Comprimir beats de baixa novidade e remover repetição sem valor incremental.",
    );
  }

  return {
    score,
    unresolvedLoops,
    lateLoops: Array.from(lateLoops),
    flatRuns,
    lowNoveltyBeats,
    recommendations,
  };
}
