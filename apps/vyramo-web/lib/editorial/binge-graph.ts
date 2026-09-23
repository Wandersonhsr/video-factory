export type ContentNode = {
  id: string;
  title: string;
  topic: string;
  thesis: string;
  cluster: string;
  audienceJob: string;
  novelty: number;
  commercialValue: number;
  evergreen: number;
  produced?: boolean;
  published?: boolean;
};

export type ContentEdge = {
  fromId: string;
  toId: string;
  curiosityContinuity: number;
  semanticContinuity: number;
  noveltyGain: number;
  audienceOverlap: number;
  commercialContinuity: number;
  cannibalizationRisk: number;
  score?: number;
  bridgeLine?: string;
};

export type SessionRecommendation = {
  primary: ContentEdge;
  secondary?: ContentEdge;
  wildcard?: ContentEdge;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function scoreContentEdge(edge: ContentEdge): number {
  const score =
    clamp(edge.curiosityContinuity) * 0.30 +
    clamp(edge.semanticContinuity) * 0.20 +
    clamp(edge.noveltyGain) * 0.20 +
    clamp(edge.audienceOverlap) * 0.15 +
    clamp(edge.commercialContinuity) * 0.10 +
    (100 - clamp(edge.cannibalizationRisk)) * 0.05;

  return Math.round(score * 10) / 10;
}

export function selectSessionRecommendations(
  currentId: string,
  nodes: ContentNode[],
  edges: ContentEdge[],
): SessionRecommendation | null {
  const available = edges
    .filter((edge) => edge.fromId === currentId)
    .filter((edge) => {
      const destination = nodes.find((node) => node.id === edge.toId);
      return destination?.published;
    })
    .map((edge) => ({ ...edge, score: scoreContentEdge(edge) }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  if (!available.length) return null;

  const primary = available[0];

  const secondary = available.find(
    (edge) =>
      edge.toId !== primary.toId &&
      edge.semanticContinuity >= 55 &&
      edge.noveltyGain >= 45,
  );

  const wildcard = available.find(
    (edge) =>
      edge.toId !== primary.toId &&
      edge.toId !== secondary?.toId &&
      edge.noveltyGain >= 75 &&
      edge.audienceOverlap >= 45,
  );

  return {
    primary,
    secondary,
    wildcard,
  };
}

export type LateralizationAxis =
  | "mechanism"
  | "money"
  | "power"
  | "history"
  | "technology"
  | "psychology"
  | "failure"
  | "geography"
  | "people"
  | "future"
  | "hidden-infrastructure"
  | "second-order-effects";

export const LATERALIZATION_AXES: Array<{
  id: LateralizationAxis;
  question: string;
}> = [
  { id: "mechanism", question: "How does this actually work under the hood?" },
  { id: "money", question: "Who makes money, how much, and where is the margin?" },
  { id: "power", question: "Who gains leverage or control because of this?" },
  { id: "history", question: "What sequence of events created this system?" },
  { id: "technology", question: "What technology makes this possible or vulnerable?" },
  { id: "psychology", question: "What human behavior keeps this system alive?" },
  { id: "failure", question: "What happens when this breaks, collapses, or is exploited?" },
  { id: "geography", question: "Why does this work differently across countries or cities?" },
  { id: "people", question: "Which people or companies changed the outcome?" },
  { id: "future", question: "What changes next if current incentives continue?" },
  { id: "hidden-infrastructure", question: "What invisible layer does everyone depend on?" },
  { id: "second-order-effects", question: "What consequence appears one or two steps later?" },
];

export function buildLateralizationBrief(seedFact: string) {
  return {
    seedFact,
    axes: LATERALIZATION_AXES.map((axis) => ({
      axis: axis.id,
      question: axis.question,
      instruction:
        "Create a distinct thesis and viewer promise from this axis. Do not restate the seed fact. Add new evidence, stakes, and causal depth.",
    })),
  };
}

export type SessionMetricSnapshot = {
  videoId: string;
  endScreenImpressions?: number;
  endScreenClicks?: number;
  endScreenClickRate?: number;
  viewsFromSameChannelAfter?: number;
  nextVideoId?: string;
};

export function deriveSessionLearning(snapshot: SessionMetricSnapshot) {
  const clickRate =
    snapshot.endScreenClickRate ??
    (snapshot.endScreenImpressions && snapshot.endScreenClicks !== undefined
      ? (snapshot.endScreenClicks / snapshot.endScreenImpressions) * 100
      : undefined);

  if (clickRate === undefined) {
    return {
      status: "insufficient-data" as const,
      action:
        "Collect end-screen impressions/clicks before changing the bridge or recommendation strategy.",
    };
  }

  if (clickRate < 1.5) {
    return {
      status: "weak" as const,
      action:
        "Rework the final 30–60 seconds so the next video solves an unresolved adjacent question; reduce generic CTA language and tighten topical continuity.",
    };
  }

  if (clickRate < 4) {
    return {
      status: "watch" as const,
      action:
        "Keep the current bridge logic, but test a stronger primary recommendation and a clearer verbal handoff.",
    };
  }

  return {
    status: "strong" as const,
    action:
      "Preserve the structural bridge mechanism and test it on another topic cluster without copying wording.",
  };
}
