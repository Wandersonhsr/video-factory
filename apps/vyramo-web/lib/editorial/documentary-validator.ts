import { FORTUNE_DECODED_CHANNEL_LAWS, type DocumentaryScriptInput, type DocumentaryScriptOutput } from "./documentary-script";

export type DocumentaryValidation = {
  score: number;
  gate: "PASS" | "REVISE" | "BLOCK";
  blockers: string[];
  warnings: string[];
  checks: { factualIntegrity: number; continuity: number; sentenceDiscipline: number; tensionCadence: number; ctaDiscipline: number; nextVideoBridge: number; structuralCompleteness: number };
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const sentenceWordCounts = (text: string) => text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean).map((s) => s.split(/\s+/).filter(Boolean).length);

const allNarration = (output: DocumentaryScriptOutput) => {
  const blocks = Object.values(output.roteiro).map((block) => block.texto);
  const scenes = output.storyboard.map((scene) => scene.narration);
  return [...blocks, ...scenes].join(" ");
};

export function validateDocumentaryScript(input: DocumentaryScriptInput, output: DocumentaryScriptOutput): DocumentaryValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const unverified = output.claims.filter((claim) => claim.verification_status !== "verified" || claim.source_ids.length === 0);
  const factualIntegrity = output.claims.length === 0 ? 0 : clamp(100 - (unverified.length / Math.max(1, output.claims.length)) * 100);
  if (unverified.length > 0) blockers.push(String(unverified.length) + " factual claim(s) lack verified source mapping.");

  const repeated = output.continuity.informacoes_repetidas_do_video_anterior || [];
  const continuity = clamp(100 - repeated.length * 25);
  if (repeated.length > 0) blockers.push(String(repeated.length) + " repeated information block(s) detected from the previous episode.");

  const counts = sentenceWordCounts(allNarration(output));
  const tooLong = counts.filter((count) => count > FORTUNE_DECODED_CHANNEL_LAWS.maxSentenceWords).length;
  const sentenceDiscipline = counts.length === 0 ? 0 : clamp(100 - (tooLong / counts.length) * 180);
  if (tooLong > 0) warnings.push(String(tooLong) + " sentence(s) exceed the ~20-word channel rule.");

  const durationSeconds = Math.max(6, input.duracao_alvo || FORTUNE_DECODED_CHANNEL_LAWS.defaultDurationMinutes) * 60;
  const tensionMoments = output.storyboard.filter((scene) => scene.tensao_check).map((scene) => scene.start_second).sort((a, b) => a - b);
  let cadenceViolations = 0;
  let previous = 30;
  for (const moment of tensionMoments) { if (moment - previous > 110) cadenceViolations += 1; previous = moment; }
  if (durationSeconds - 40 - previous > 110) cadenceViolations += 1;
  const expectedTensionChecks = Math.max(1, Math.floor((durationSeconds - 45) / 90));
  const missingTensionChecks = Math.max(0, expectedTensionChecks - tensionMoments.length);
  const tensionCadence = clamp(100 - cadenceViolations * 18 - missingTensionChecks * 10);
  if (tensionCadence < 80) warnings.push("Tension renewal cadence is too sparse for the target duration.");

  const ctaTimes = output.ctas.map((cta) => cta.placement_second).sort((a, b) => a - b);
  let stackedCtas = 0;
  for (let i = 1; i < ctaTimes.length; i += 1) if (ctaTimes[i] - ctaTimes[i - 1] < 25) stackedCtas += 1;
  const earlyCtas = output.ctas.filter((cta) => cta.placement_second < 75);
  const ctaDiscipline = clamp(100 - stackedCtas * 25 - earlyCtas.length * 30);
  if (earlyCtas.length > 0) warnings.push("CTA appears before enough value has been delivered.");
  if (stackedCtas > 0) warnings.push("CTA stacking detected; separate asks to reduce friction.");

  const nextQuestion = output.gancho_proximo_video?.trim() || "";
  const nextVideoBridge = nextQuestion.endsWith("?") && nextQuestion.split(/\s+/).length >= 5 ? 100 : 45;
  if (nextVideoBridge < 100) blockers.push("Next-video bridge must be a specific unanswered question.");

  const requiredBlocks = [output.roteiro.hook, output.roteiro.promessa, output.roteiro.ato_1, output.roteiro.ato_2, output.roteiro.virada, output.roteiro.resolucao, output.roteiro.fechamento_gancho];
  const missingBlocks = requiredBlocks.filter((block) => !block?.texto?.trim()).length;
  const structuralCompleteness = clamp(100 - missingBlocks * 20);
  if (missingBlocks > 0) blockers.push(String(missingBlocks) + " required narrative block(s) are empty.");

  const weighted = factualIntegrity * 0.22 + continuity * 0.14 + sentenceDiscipline * 0.12 + tensionCadence * 0.16 + ctaDiscipline * 0.10 + nextVideoBridge * 0.12 + structuralCompleteness * 0.14;
  const score = Math.round(weighted * 10) / 10;

  return { score, gate: blockers.length > 0 ? "BLOCK" : score >= FORTUNE_DECODED_CHANNEL_LAWS.qualityGate ? "PASS" : "REVISE", blockers, warnings, checks: { factualIntegrity: Math.round(factualIntegrity * 10) / 10, continuity: Math.round(continuity * 10) / 10, sentenceDiscipline: Math.round(sentenceDiscipline * 10) / 10, tensionCadence: Math.round(tensionCadence * 10) / 10, ctaDiscipline: Math.round(ctaDiscipline * 10) / 10, nextVideoBridge, structuralCompleteness } };
}