export type BenchmarkVideo = {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  subscribers: number;
  publishedAt: string;
  ageDays: number;
  views: number;
  viewsPerDay: number;
  durationSeconds: number;
  longForm: boolean;
  viewToSubscriberRatio: number;
  eligibleDiamondChannel: boolean;
  opportunityScore: number;
};

export type PerformanceMoment = {
  second: number;
  type: "dip" | "spike" | "top";
  delta?: number;
  sceneId?: string;
  note?: string;
};

export type VideoPerformanceSnapshot = {
  videoId: string;
  title: string;
  impressions?: number;
  views: number;
  ctr?: number;
  averageViewDurationSeconds?: number;
  averagePercentageViewed?: number;
  retention30s?: number;
  finalRetention?: number;
  watchTimeHours?: number;
  revenueUsd?: number;
  rpmUsd?: number;
  subscribersGained?: number;
  returningViewers?: number;
  moments?: PerformanceMoment[];
};

export type LearningSignal = {
  area:
    | "topic"
    | "packaging"
    | "hook"
    | "story"
    | "scene"
    | "voice"
    | "retention"
    | "monetization";
  severity: "positive" | "watch" | "critical";
  evidence: string;
  action: string;
};

export type EditorialQualityCriteria = {
  hook: number;
  storyArchitecture: number;
  retentionDesign: number;
  originality: number;
  valueDensity: number;
  visualNarrative: number;
  packagingAndSeo: number;
  monetizationSafety: number;
  evidenceIntegrity: number;
};

export type EditorialQualityReport = {
  total: number;
  gate: "PASS" | "REVISE" | "BLOCK";
  criteria: EditorialQualityCriteria;
  blockers: string[];
  revisionPriorities: string[];
};

export type EditorialAgentInput = {
  channel: string;
  niche: string;
  topic: string;
  targetAudience: string;
  targetDurationMinutes: number;
  language: string;
  marketBenchmarks: BenchmarkVideo[];
  performanceHistory?: VideoPerformanceSnapshot[];
  targetQuality?: number;
};

export type EditorialModel = {
  completeJson<T>(input: {
    role: string;
    system: string;
    prompt: string;
    schemaHint: string;
  }): Promise<T>;
};
