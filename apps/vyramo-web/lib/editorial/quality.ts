import type {
  EditorialQualityCriteria,
  EditorialQualityReport,
} from "./types";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const WEIGHTS: Record<keyof EditorialQualityCriteria, number> = {
  hook: 0.15,
  storyArchitecture: 0.18,
  retentionDesign: 0.15,
  originality: 0.15,
  valueDensity: 0.10,
  visualNarrative: 0.08,
  packagingAndSeo: 0.08,
  monetizationSafety: 0.06,
  evidenceIntegrity: 0.05,
};

const LABELS: Record<keyof EditorialQualityCriteria, string> = {
  hook: "Hook",
  storyArchitecture: "Story architecture",
  retentionDesign: "Retention design",
  originality: "Originality",
  valueDensity: "Value density",
  visualNarrative: "Visual narrative",
  packagingAndSeo: "Packaging/SEO",
  monetizationSafety: "Monetization safety",
  evidenceIntegrity: "Evidence integrity",
};

export const DIAMOND_QUALITY_TARGET = 95;

export function scoreEditorialQuality(
  criteria: EditorialQualityCriteria,
  blockers: string[] = [],
  target = DIAMOND_QUALITY_TARGET,
): EditorialQualityReport {
  const entries = Object.entries(WEIGHTS) as Array<
    [keyof EditorialQualityCriteria, number]
  >;

  const total = entries.reduce(
    (sum, [key, weight]) => sum + clamp(criteria[key]) * weight,
    0,
  );

  const revisionPriorities = entries
    .map(([key, weight]) => ({
      key,
      weightedGap: (100 - clamp(criteria[key])) * weight,
    }))
    .filter((item) => item.weightedGap > 0)
    .sort((a, b) => b.weightedGap - a.weightedGap)
    .slice(0, 4)
    .map((item) => LABELS[item.key]);

  const rounded = Math.round(total * 10) / 10;

  return {
    total: rounded,
    gate: blockers.length > 0 ? "BLOCK" : rounded >= target ? "PASS" : "REVISE",
    criteria: Object.fromEntries(
      entries.map(([key]) => [key, clamp(criteria[key])]),
    ) as EditorialQualityCriteria,
    blockers,
    revisionPriorities,
  };
}
