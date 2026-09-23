export type ManualSignals = {
  advertiserValue: number;
  tier1Fit: number;
  browsePotential: number;
  storyPotential: number;
  evergreen: number;
  competitionOpportunity: number;
  productionEfficiency: number;
  sponsorPotential: number;
  affiliatePotential: number;
  policySafety: number;
};

export type MarketEvidence = {
  sampleSize: number;
  medianViews: number;
  p90Views: number;
  medianViewsPerDay: number;
  longFormShare: number;
  medianDurationSeconds: number;
  outlierRatio: number;
};

export type GoldScoreResult = {
  manualScore: number;
  marketScore: number | null;
  goldScore: number;
  confidence: "hypothesis" | "market-backed";
  revenue: {
    low: number;
    mid: number;
    high: number;
  };
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const weightedAverage = (
  source: Record<string, number>,
  weights: Record<string, number>,
) => {
  let weighted = 0;
  let total = 0;

  for (const [key, weight] of Object.entries(weights)) {
    weighted += clamp(source[key] ?? 0) * weight;
    total += weight;
  }

  return total ? weighted / total : 0;
};

const logScore = (value: number, floor: number, ceiling: number) => {
  if (value <= floor) return 0;
  if (value >= ceiling) return 100;

  const low = Math.log10(floor + 1);
  const high = Math.log10(ceiling + 1);
  const current = Math.log10(value + 1);

  return clamp(((current - low) / (high - low)) * 100);
};

export function scoreMarketEvidence(evidence: MarketEvidence): number {
  const velocity = logScore(evidence.medianViewsPerDay, 50, 100_000);
  const medianReach = logScore(evidence.medianViews, 5_000, 2_000_000);
  const outlier = clamp(((evidence.outlierRatio - 1) / 9) * 100);
  const longForm = clamp(evidence.longFormShare * 100);

  return weightedAverage(
    {
      velocity,
      medianReach,
      outlier,
      longForm,
    },
    {
      velocity: 0.36,
      medianReach: 0.28,
      outlier: 0.18,
      longForm: 0.18,
    },
  );
}

export function calculateGoldScore(
  manual: ManualSignals,
  evidence: MarketEvidence | null,
  monthlyViewsTarget: number,
  rpmLow: number,
  rpmHigh: number,
): GoldScoreResult {
  const manualScore = weightedAverage(manual, {
    advertiserValue: 0.15,
    tier1Fit: 0.12,
    browsePotential: 0.13,
    storyPotential: 0.12,
    evergreen: 0.08,
    competitionOpportunity: 0.08,
    productionEfficiency: 0.07,
    sponsorPotential: 0.09,
    affiliatePotential: 0.06,
    policySafety: 0.10,
  });

  const marketScore = evidence ? scoreMarketEvidence(evidence) : null;
  const goldScore =
    marketScore === null
      ? manualScore
      : manualScore * 0.68 + marketScore * 0.32;

  const safeLow = Math.max(0, rpmLow);
  const safeHigh = Math.max(safeLow, rpmHigh);
  const rpmMid = (safeLow + safeHigh) / 2;

  return {
    manualScore: Math.round(manualScore * 10) / 10,
    marketScore:
      marketScore === null ? null : Math.round(marketScore * 10) / 10,
    goldScore: Math.round(goldScore * 10) / 10,
    confidence: evidence ? "market-backed" : "hypothesis",
    revenue: {
      low: Math.round((monthlyViewsTarget / 1000) * safeLow),
      mid: Math.round((monthlyViewsTarget / 1000) * rpmMid),
      high: Math.round((monthlyViewsTarget / 1000) * safeHigh),
    },
  };
}

export const fortuneDecodedDefaults: ManualSignals = {
  advertiserValue: 88,
  tier1Fit: 90,
  browsePotential: 82,
  storyPotential: 90,
  evergreen: 84,
  competitionOpportunity: 64,
  productionEfficiency: 79,
  sponsorPotential: 88,
  affiliatePotential: 72,
  policySafety: 92,
};
