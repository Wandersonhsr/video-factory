import type { VideoPerformanceSnapshot } from "./types";
import type { AlsoAskedIntentGraph } from "./alsoasked-intent";

export type EvidenceItem = { id: string; url?: string; publisher?: string; title: string; publishedAt?: string; note?: string };

export type DocumentaryScriptInput = {
  fato_central: string;
  angulo: string;
  video_anterior?: string;
  duracao_alvo?: number;
  idioma?: string;
  publico?: string;
  proximo_angulo?: string;
  angulos_ja_usados?: string[];
  evidencePack?: EvidenceItem[];
  performanceHistory?: VideoPerformanceSnapshot[];
  intentGraph?: AlsoAskedIntentGraph;
};

export type ScriptBlock = { janela: string; texto: string; tensao_check?: boolean; objetivo_narrativo: string };
export type DocumentaryScene = {
  scene_id: string; start_second: number; end_second: number; narration: string;
  visual_direction: string;
  visual_source_type: "generative-video" | "licensed-stock" | "original-motion" | "chart" | "map" | "document" | "interface" | "still-image";
  source_ids: string[]; tensao_check?: boolean; cta_id?: string;
};
export type DocumentaryClaim = { claim: string; source_ids: string[]; verification_status: "verified" | "needs_verification" };
export type DocumentaryCTA = { id: string; type: "comment" | "subscribe" | "like" | "share" | "next_video"; placement_second: number; trigger: string; copy: string };

export type DocumentaryScriptOutput = {
  titulo: string;
  hook_opcoes: [string, string];
  thumbnail_sugestao: string;
  roteiro: { hook: ScriptBlock; promessa: ScriptBlock; ato_1: ScriptBlock; ato_2: ScriptBlock; virada: ScriptBlock; resolucao: ScriptBlock; fechamento_gancho: ScriptBlock };
  loop_principal: string;
  gancho_proximo_video: string;
  storyboard: DocumentaryScene[];
  claims: DocumentaryClaim[];
  ctas: DocumentaryCTA[];
  continuity: { referencias_ao_video_anterior: string[]; informacoes_repetidas_do_video_anterior: string[]; novo_valor_entregue: string[]; proximo_angulo: string };
  seo: { primary_search_intent: string; secondary_search_intents: string[]; description: string; chapters: Array<{ time: string; title: string }>; title_variants: string[] };
  validation_notes: string[];
};

export const FORTUNE_DECODED_CHANNEL_LAWS = {
  defaultDurationMinutes: 9, defaultLanguage: "English", targetWordsPerMinute: 150, maxSentenceWords: 20, microHookIntervalSeconds: 90, qualityGate: 95,
  ctaRules: [
    "Never ask for engagement before delivering concrete value.",
    "Use at most one CTA at a time; never stack subscribe, like, comment and share in one sentence.",
    "Comment CTA must ask a specific opinion or prediction that follows naturally from the story.",
    "Subscribe CTA is allowed only after a payoff that proves the channel value.",
    "Like/share CTA must be contextual, optional and concise.",
    "The final CTA prioritizes the next-video question and end-screen continuation."
  ],
  narrativeRules: [
    "No greeting, channel intro, or generic setup before the hook.",
    "No institutional filler such as in this video we will explore.",
    "One spoken idea per sentence.",
    "Every factual claim must map to at least one evidence source before publication.",
    "Do not repeat information from the previous video; reference it only when continuity requires it.",
    "Every 60-105 seconds, renew tension with evidence, contrast, consequence, reversal, or a sharper question.",
    "The main promise must be fully paid off before opening the next-video question.",
    "The next-video hook must be a specific unanswered question tied to a distinct angle."
  ]
} as const;

export function buildTimingPlan(durationMinutes = 9) {
  const total = Math.max(6, durationMinutes) * 60;
  const second = (ratio: number) => Math.round(total * ratio);
  const fmt = (value: number) => { const m = Math.floor(value / 60); const s = value % 60; return m + ":" + String(s).padStart(2, "0"); };
  return {
    totalSeconds: total, hook: "0:00-0:15", promessa: "0:15-0:30",
    ato_1: "0:30-" + fmt(second(0.28)), ato_2: fmt(second(0.28)) + "-" + fmt(second(0.61)),
    virada: fmt(second(0.61)) + "-" + fmt(second(0.76)), resolucao: fmt(second(0.76)) + "-" + fmt(second(0.93)),
    fechamento_gancho: fmt(second(0.93)) + "-" + fmt(total),
    tensionCheckSeconds: Array.from({ length: Math.max(1, Math.floor((total - 45) / 90)) }, (_, i) => 75 + i * 90).filter((v) => v < total - 40)
  };
}

export function buildDocumentaryBrief(input: DocumentaryScriptInput) {
  const duration = input.duracao_alvo ?? FORTUNE_DECODED_CHANNEL_LAWS.defaultDurationMinutes;
  return { channel: "Fortune Decoded", role: "Cinematic documentary writer for technology, AI, money systems and business.", input: { ...input, duracao_alvo: duration, idioma: input.idioma || FORTUNE_DECODED_CHANNEL_LAWS.defaultLanguage }, timing: buildTimingPlan(duration), laws: FORTUNE_DECODED_CHANNEL_LAWS };
}