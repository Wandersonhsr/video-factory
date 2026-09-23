import { buildAdaptiveMemory } from "./learning";
import { buildDocumentaryBrief, type DocumentaryScriptInput, type DocumentaryScriptOutput } from "./documentary-script";
import { validateDocumentaryScript } from "./documentary-validator";
import type { EditorialModel } from "./types";

export type DocumentaryAgentResult = { draft: DocumentaryScriptOutput; validation: ReturnType<typeof validateDocumentaryScript>; iterations: number };

const ROLE = "Fortune Decoded Documentary Script Director";

const SYSTEM = [
  "You are the senior documentary writer and story director for Fortune Decoded.",
  "Create cinematic documentaries about technology, AI, business, money systems and power.",
  "Think scene-first and storyboard-first. Each scene has one spoken idea, one narrative purpose and one visual job.",
  "Structure first, script second, visuals third, validation last.",
  "Treat evidence links and files as source material, never as text to copy.",
  "A single central fact may generate many videos, but each angle must deliver a distinct thesis and evidence set.",
  "No greetings, generic institutional language, filler or fake urgency.",
  "Use short spoken sentences; target no more than 20 words per sentence.",
  "Every factual claim must cite source IDs from the evidence pack.",
  "If evidence is insufficient, mark needs_verification instead of inventing.",
  "Never repeat substantive information from the previous episode.",
  "Renew narrative tension approximately every 90 seconds with evidence, contrast, consequence, reversal or a sharper question.",
  "Fully resolve the main promise before opening the next-video question.",
  "The next-video hook must be a specific unanswered question tied to a different angle.",
  "CTAs must be earned by value. Never stack subscribe, like, comment and share in one sentence.",
  "Never copy or closely paraphrase another creator script, sequence, scenes, title, thumbnail text or distinctive expression.",
  "Benchmark mechanisms, not surface content."
].join("
");

export async function runDocumentaryScriptAgent(input: DocumentaryScriptInput, model: EditorialModel): Promise<DocumentaryAgentResult> {
  const brief = buildDocumentaryBrief(input);
  const adaptiveMemory = buildAdaptiveMemory(input.performanceHistory || []);
  let draft = await model.completeJson<DocumentaryScriptOutput>({
    role: ROLE,
    system: SYSTEM,
    prompt: "Create the documentary package from this brief.
BRIEF:
" + JSON.stringify(brief) + "
ADAPTIVE MEMORY:
" + JSON.stringify(adaptiveMemory) + "
Return JSON only. The roteiro keys must be hook, promessa, ato_1, ato_2, virada, resolucao and fechamento_gancho. Also return storyboard, claims, ctas, continuity and seo.",
    schemaHint: "{titulo,hook_opcoes:[string,string],thumbnail_sugestao,roteiro,loop_principal,gancho_proximo_video,storyboard,claims,ctas,continuity,seo,validation_notes}"
  });

  let validation = validateDocumentaryScript(input, draft);
  let iterations = 0;
  while (validation.gate !== "PASS" && iterations < 4) {
    draft = await model.completeJson<DocumentaryScriptOutput>({
      role: "Fortune Decoded Documentary CEO / Red Team",
      system: SYSTEM,
      prompt: "Repair only what fails. Preserve strong sections.
CURRENT DRAFT:
" + JSON.stringify(draft) + "
VALIDATION:
" + JSON.stringify(validation) + "
Fix blockers first, then warnings. Return full JSON only.",
      schemaHint: "{titulo,hook_opcoes:[string,string],thumbnail_sugestao,roteiro,loop_principal,gancho_proximo_video,storyboard,claims,ctas,continuity,seo,validation_notes}"
    });
    validation = validateDocumentaryScript(input, draft);
    iterations += 1;
  }
  return { draft, validation, iterations };
}