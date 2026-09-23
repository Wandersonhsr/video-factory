export type AlsoAskedQuestion = {
  id: string;
  question: string;
  answer?: string;
  url?: string;
  pageTitle?: string;
  tier: 1 | 2 | 3;
  parentId?: string;
  region?: string;
  language?: string;
  isAiOverview?: boolean;
};

export type AlsoAskedIntentGraph = {
  rootQuery: string;
  country: string;
  city?: string;
  language: string;
  depth: "standard" | "deep";
  questions: AlsoAskedQuestion[];
  capturedAt?: string;
};

export type IntentRole =
  | "hook"
  | "context"
  | "mechanism"
  | "money"
  | "risk"
  | "comparison"
  | "history"
  | "future"
  | "people"
  | "next-video";

export type IntentSignal = {
  questionId: string;
  question: string;
  role: IntentRole;
  proximityScore: number;
  commercialSignal: number;
  narrativeSignal: number;
  nextVideoPotential: number;
  totalScore: number;
  sourceUrl?: string;
};

export type IntentCoveragePlan = {
  rootQuery: string;
  primaryQuestions: IntentSignal[];
  inVideoQuestions: IntentSignal[];
  nextVideoQuestions: IntentSignal[];
  supportingQuestions: IntentSignal[];
  repeatedThemes: string[];
  principle: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const moneyTerms = [
  "cost",
  "price",
  "money",
  "revenue",
  "profit",
  "worth",
  "salary",
  "fee",
  "invest",
  "investment",
  "insurance",
  "credit",
  "bank",
  "business",
  "tax",
];

const riskTerms = [
  "risk",
  "safe",
  "danger",
  "problem",
  "failure",
  "downside",
  "crash",
  "fraud",
  "scam",
  "illegal",
  "lawsuit",
];

const futureTerms = [
  "future",
  "next",
  "replace",
  "will",
  "ai",
  "automation",
  "change",
  "2030",
  "2035",
];

const historyTerms = [
  "history",
  "start",
  "started",
  "founded",
  "origin",
  "invented",
  "created",
  "first",
];

const comparisonTerms = [
  "vs",
  "versus",
  "better",
  "difference",
  "compare",
  "alternative",
];

const mechanismTerms = [
  "how",
  "why",
  "work",
  "works",
  "make",
  "made",
  "control",
  "behind",
];

function containsAny(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function inferRole(question: string): IntentRole {
  const q = question.toLowerCase();

  if (containsAny(q, moneyTerms)) return "money";
  if (containsAny(q, riskTerms)) return "risk";
  if (containsAny(q, futureTerms)) return "future";
  if (containsAny(q, historyTerms)) return "history";
  if (containsAny(q, comparisonTerms)) return "comparison";
  if (containsAny(q, mechanismTerms)) return "mechanism";
  if (q.includes("who ")) return "people";

  return "context";
}

function scoreQuestion(question: AlsoAskedQuestion): IntentSignal {
  const role = inferRole(question.question);

  const proximityScore =
    question.tier === 1 ? 100 : question.tier === 2 ? 72 : 52;

  const commercialSignal = containsAny(question.question, moneyTerms)
    ? 90
    : role === "comparison"
      ? 68
      : role === "risk"
        ? 60
        : 42;

  const narrativeSignal =
    role === "mechanism" || role === "risk" || role === "future"
      ? 92
      : role === "money" || role === "history"
        ? 82
        : 68;

  const nextVideoPotential =
    role === "future" || role === "risk" || role === "comparison"
      ? 94
      : role === "money" || role === "mechanism"
        ? 84
        : 65;

  const totalScore =
    proximityScore * 0.35 +
    commercialSignal * 0.20 +
    narrativeSignal * 0.25 +
    nextVideoPotential * 0.20;

  return {
    questionId: question.id,
    question: question.question,
    role,
    proximityScore,
    commercialSignal,
    narrativeSignal,
    nextVideoPotential,
    totalScore: Math.round(clamp(totalScore) * 10) / 10,
    sourceUrl: question.url,
  };
}

function themeKey(question: string) {
  return question
    .toLowerCase()
    .replace(/[?.,!:'"]/g, "")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 5 &&
        ![
          "which",
          "where",
          "there",
          "their",
          "about",
          "would",
          "could",
          "should",
          "what",
          "when",
          "how",
          "does",
          "with",
          "from",
          "this",
          "that",
        ].includes(word),
    );
}

export function buildIntentCoveragePlan(
  graph: AlsoAskedIntentGraph,
): IntentCoveragePlan {
  const ranked = graph.questions
    .map(scoreQuestion)
    .sort((a, b) => b.totalScore - a.totalScore);

  const themeCounts = new Map<string, number>();
  for (const item of ranked) {
    for (const token of themeKey(item.question)) {
      themeCounts.set(token, (themeCounts.get(token) || 0) + 1);
    }
  }

  const repeatedThemes = Array.from(themeCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([theme]) => theme);

  const primaryQuestions = ranked
    .filter((signal) => signal.proximityScore >= 72)
    .slice(0, 5);

  const inVideoQuestions = ranked
    .filter(
      (signal) =>
        signal.narrativeSignal >= 75 &&
        !primaryQuestions.some(
          (primary) => primary.questionId === signal.questionId,
        ),
    )
    .slice(0, 8);

  const nextVideoQuestions = ranked
    .filter(
      (signal) =>
        signal.nextVideoPotential >= 84 &&
        !primaryQuestions.some(
          (primary) => primary.questionId === signal.questionId,
        ) &&
        !inVideoQuestions.some(
          (current) => current.questionId === signal.questionId,
        ),
    )
    .slice(0, 6)
    .map((signal) => ({ ...signal, role: "next-video" as IntentRole }));

  const used = new Set(
    [...primaryQuestions, ...inVideoQuestions, ...nextVideoQuestions].map(
      (item) => item.questionId,
    ),
  );

  const supportingQuestions = ranked
    .filter((signal) => !used.has(signal.questionId))
    .slice(0, 12);

  return {
    rootQuery: graph.rootQuery,
    primaryQuestions,
    inVideoQuestions,
    nextVideoQuestions,
    supportingQuestions,
    repeatedThemes,
    principle:
      "Treat AlsoAsked as intent proximity, not search-volume data. Use questions to understand what the audience wants next, not to stuff every question into one video.",
  };
}

export function buildAlsoAskedResearchBrief(graph: AlsoAskedIntentGraph) {
  const plan = buildIntentCoveragePlan(graph);

  return {
    source: "AlsoAsked / Google People Also Ask intent graph",
    locale: {
      country: graph.country,
      city: graph.city,
      language: graph.language,
    },
    depth: graph.depth,
    rootQuery: graph.rootQuery,
    plan,
    editorialRules: [
      "Do not answer every PAA question in the same episode.",
      "Use tier-1 questions to define the viewer's immediate intent.",
      "Use deeper questions to create micro-hooks, evidence gaps and adjacent episodes.",
      "Repeated themes indicate intent clusters, not guaranteed search volume.",
      "Questions selected for the next video must require a genuinely different thesis.",
      "Use country/city/language targeting to prevent mixing different audience intents.",
    ],
  };
}
