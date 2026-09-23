import { buildAdaptiveMemory } from "./learning";
import { DIAMOND_AGENT_ROLES } from "./prompts";
import { scoreEditorialQuality } from "./quality";
import type {
  EditorialAgentInput,
  EditorialModel,
  EditorialQualityCriteria,
  EditorialQualityReport,
} from "./types";

type StageOutput = Record<string, unknown>;

type CriticOutput = {
  criteria: EditorialQualityCriteria;
  blockers: string[];
  revisionInstructions: string[];
};

export type DiamondAgentResult = {
  opportunity: StageOutput;
  benchmarkDeconstruction: StageOutput;
  hook: StageOutput;
  story: StageOutput;
  script: StageOutput;
  lateralization: StageOutput;
  sessionPlan: StageOutput;
  visualPlan: StageOutput;
  packaging: StageOutput;
  policyAudit: StageOutput;
  quality: EditorialQualityReport;
  iterations: number;
};

const jsonHint = "Return valid JSON only. Do not include markdown fences.";

async function runStage<T extends StageOutput>(
  model: EditorialModel,
  config: { role: string; system: string },
  prompt: string,
  schemaHint: string,
) {
  return model.completeJson<T>({
    role: config.role,
    system: config.system,
    prompt,
    schemaHint: `${jsonHint} ${schemaHint}`,
  });
}

export async function runDiamondEditorialAgent(
  input: EditorialAgentInput,
  model: EditorialModel,
): Promise<DiamondAgentResult> {
  const target = input.targetQuality ?? 95;
  const memory = buildAdaptiveMemory(input.performanceHistory || []);

  const commonContext = JSON.stringify({
    channel: input.channel,
    niche: input.niche,
    topic: input.topic,
    targetAudience: input.targetAudience,
    targetDurationMinutes: input.targetDurationMinutes,
    language: input.language,
    benchmarkCount: input.marketBenchmarks.length,
    marketBenchmarks: input.marketBenchmarks.slice(0, 20),
    adaptiveMemory: memory,
  });

  const opportunity = await runStage(
    model,
    DIAMOND_AGENT_ROLES.scout,
    `Evaluate this project and produce an evidence-aware opportunity brief. CONTEXT: ${commonContext}`,
    "{thesis, audienceJob, opportunity, risks, falsifiers, evidenceUsed}",
  );

  const benchmarkDeconstruction = await runStage(
    model,
    DIAMOND_AGENT_ROLES.deconstructor,
    `Deconstruct the benchmark set structurally. Do not copy. CONTEXT: ${commonContext}`,
    "{patterns, titleMechanisms, pacingPatterns, visualGrammar, doNotCopy, transferablePrinciples}",
  );

  let hook = await runStage(
    model,
    DIAMOND_AGENT_ROLES.hook,
    `Create 5 original hook hypotheses, select one, and explain the promise/payoff. OPPORTUNITY: ${JSON.stringify(opportunity)} BENCHMARK: ${JSON.stringify(benchmarkDeconstruction)}`,
    "{candidates:[...], selected, promise, openQuestion, first30SecondsPlan}",
  );

  let story = await runStage(
    model,
    DIAMOND_AGENT_ROLES.story,
    `Build the complete documentary architecture. HOOK: ${JSON.stringify(hook)} OPPORTUNITY: ${JSON.stringify(opportunity)} MEMORY: ${JSON.stringify(memory)}`,
    "{thesis, acts, openLoops, payoffMap, scenePurposes, retentionMap}",
  );

  let script = await runStage(
    model,
    DIAMOND_AGENT_ROLES.writer,
    `Write an original long-form script from the approved architecture. STORY: ${JSON.stringify(story)} CONTEXT: ${commonContext}`,
    "{titleWorking, narration, claims:[{claim,evidenceNeeded}], sectionTimestamps}",
  );

  const lateralization = await runStage(
    model,
    DIAMOND_AGENT_ROLES.lateralizer,
    `Expand this validated topic into a content universe. Each branch must add a distinct thesis and new evidence burden. CURRENT STORY: ${JSON.stringify(story)} BENCHMARK: ${JSON.stringify(benchmarkDeconstruction)}`,
    "{seedThesis, branches:[{axis,title,thesis,viewerPromise,evidenceNeeded,commercialAngle,nextQuestion}], seriesClusters}",
  );

  const sessionPlan = await runStage(
    model,
    DIAMOND_AGENT_ROLES.session,
    `Design how this video should hand off to the next published content without undermining the current payoff. CURRENT STORY: ${JSON.stringify(story)} CONTENT UNIVERSE: ${JSON.stringify(lateralization)}`,
    "{primaryNext,secondaryNext,wildcard,final60SecondsBridge,endScreenPlan,playlistPlan}",
  );

  let visualPlan = await runStage(
    model,
    DIAMOND_AGENT_ROLES.visual,
    `Create a scene plan that makes every section visually meaningful. SCRIPT: ${JSON.stringify(script)}`,
    "{scenes:[{id,start,end,purpose,visualSource,motion,dataNeed,generativeJustification}]}",
  );

  let packaging = await runStage(
    model,
    DIAMOND_AGENT_ROLES.packaging,
    `Create 3 materially different title+thumbnail hypotheses and discoverability metadata. SCRIPT: ${JSON.stringify(script)}`,
    "{tests:[{title,thumbnailConcept,promise}], description, searchIntents, chapters}",
  );

  let policyAudit = await runStage(
    model,
    DIAMOND_AGENT_ROLES.policy,
    `Audit originality, evidence, rights and monetization risk. SCRIPT: ${JSON.stringify(script)} VISUALS: ${JSON.stringify(visualPlan)} PACKAGING: ${JSON.stringify(packaging)}`,
    "{status, blockers, warnings, originalityEvidence, licensingChecks, monetizationChecks}",
  );

  let iterations = 0;
  let quality: EditorialQualityReport = scoreEditorialQuality(
    {
      hook: 0,
      storyArchitecture: 0,
      retentionDesign: 0,
      originality: 0,
      valueDensity: 0,
      visualNarrative: 0,
      packagingAndSeo: 0,
      monetizationSafety: 0,
      evidenceIntegrity: 0,
    },
    ["Not yet reviewed"],
    target,
  );

  while (iterations < 4) {
    const critic = await runStage<CriticOutput>(
      model,
      DIAMOND_AGENT_ROLES.ceo,
      `Red-team this package against a hard ${target}/100 quality gate.
PACKAGE: ${JSON.stringify({
        opportunity,
        benchmarkDeconstruction,
        hook,
        story,
        script,
        lateralization,
        sessionPlan,
        visualPlan,
        packaging,
        policyAudit,
      })}`,
      "{criteria:{hook,storyArchitecture,retentionDesign,originality,valueDensity,visualNarrative,packagingAndSeo,monetizationSafety,evidenceIntegrity},blockers,revisionInstructions}",
    );

    quality = scoreEditorialQuality(
      critic.criteria,
      critic.blockers || [],
      target,
    );

    if (quality.gate === "PASS") break;

    const revision = await runStage<{
      hook?: StageOutput;
      story?: StageOutput;
      script?: StageOutput;
      visualPlan?: StageOutput;
      packaging?: StageOutput;
      policyAudit?: StageOutput;
    }>(
      model,
      DIAMOND_AGENT_ROLES.ceo,
      `Repair only what fails the gate. Preserve strong elements. REVISION INSTRUCTIONS: ${JSON.stringify(critic.revisionInstructions)} CURRENT PACKAGE: ${JSON.stringify({
        hook,
        story,
        script,
        visualPlan,
        packaging,
        policyAudit,
      })}`,
      "{hook?,story?,script?,visualPlan?,packaging?,policyAudit?}",
    );

    hook = revision.hook || hook;
    story = revision.story || story;
    script = revision.script || script;
    visualPlan = revision.visualPlan || visualPlan;
    packaging = revision.packaging || packaging;
    policyAudit = revision.policyAudit || policyAudit;
    iterations += 1;
  }

  return {
    opportunity,
    benchmarkDeconstruction,
    hook,
    story,
    script,
    lateralization,
    sessionPlan,
    visualPlan,
    packaging,
    policyAudit,
    quality,
    iterations,
  };
}
