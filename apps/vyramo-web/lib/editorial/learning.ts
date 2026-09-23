import type {
  LearningSignal,
  VideoPerformanceSnapshot,
} from "./types";

type LearningTargets = {
  ctrFloor: number;
  retention30s: number;
  averagePercentageViewed: number;
  finalRetention: number;
};

const DEFAULT_TARGETS: LearningTargets = {
  ctrFloor: 4.5,
  retention30s: 70,
  averagePercentageViewed: 50,
  finalRetention: 40,
};

export function deriveLearningSignals(
  video: VideoPerformanceSnapshot,
  targets: LearningTargets = DEFAULT_TARGETS,
): LearningSignal[] {
  const signals: LearningSignal[] = [];

  if (video.ctr !== undefined) {
    if (video.ctr < targets.ctrFloor) {
      signals.push({
        area: "packaging",
        severity: "critical",
        evidence: `CTR ${video.ctr.toFixed(1)}% abaixo do piso interno de ${targets.ctrFloor}%.`,
        action:
          "Reformular promessa, título e thumbnail. Preserve o conteúdo se a retenção estiver saudável.",
      });
    } else {
      signals.push({
        area: "packaging",
        severity: "positive",
        evidence: `CTR ${video.ctr.toFixed(1)}% acima do piso interno.`,
        action: "Registrar padrões visuais e semânticos desta embalagem para novos testes A/B.",
      });
    }
  }

  if (video.retention30s !== undefined) {
    if (video.retention30s < targets.retention30s) {
      signals.push({
        area: "hook",
        severity: "critical",
        evidence: `Retenção aos 30s de ${video.retention30s.toFixed(1)}%.`,
        action:
          "Reescrever os 30s iniciais: alinhar promessa ao título/thumbnail, antecipar tensão e remover contexto dispensável.",
      });
    } else {
      signals.push({
        area: "hook",
        severity: "positive",
        evidence: `Retenção aos 30s de ${video.retention30s.toFixed(1)}%.`,
        action: "Preservar o mecanismo de hook e testar variações sem copiar a superfície.",
      });
    }
  }

  if (
    video.averagePercentageViewed !== undefined &&
    video.averagePercentageViewed < targets.averagePercentageViewed
  ) {
    signals.push({
      area: "retention",
      severity: "watch",
      evidence: `Average percentage viewed de ${video.averagePercentageViewed.toFixed(1)}%.`,
      action:
        "Comprimir explicações, aumentar densidade de novidade e revisar intervalos entre payoffs.",
    });
  }

  if (
    video.finalRetention !== undefined &&
    video.finalRetention < targets.finalRetention
  ) {
    signals.push({
      area: "story",
      severity: "critical",
      evidence: `Retenção final de ${video.finalRetention.toFixed(1)}%.`,
      action:
        "Reestruturar a segunda metade: manter perguntas abertas, escalada e um payoff final que ainda não esteja resolvido cedo demais.",
    });
  }

  for (const moment of video.moments || []) {
    if (moment.type === "dip") {
      signals.push({
        area: "scene",
        severity: "critical",
        evidence: `Dip em ${moment.second}s${moment.sceneId ? ` na ${moment.sceneId}` : ""}${moment.delta ? ` (${moment.delta}pp)` : ""}.`,
        action:
          "Auditar exatamente essa cena: texto, duração, visual, voz, densidade de informação, transição e promessa pendente.",
      });
    }

    if (moment.type === "spike" || moment.type === "top") {
      signals.push({
        area: "scene",
        severity: "positive",
        evidence: `${moment.type === "spike" ? "Spike" : "Top moment"} em ${moment.second}s.`,
        action:
          "Extrair o mecanismo causal provável e introduzir versões estruturais dele mais cedo em próximos vídeos.",
      });
    }
  }

  if (video.rpmUsd !== undefined) {
    signals.push({
      area: "monetization",
      severity: "positive",
      evidence: `RPM observado: US$${video.rpmUsd.toFixed(2)}.`,
      action:
        "Usar como dado real do canal para calibrar cenários econômicos; nunca extrapolar para outros temas sem amostra.",
    });
  }

  return signals;
}

export function buildAdaptiveMemory(
  history: VideoPerformanceSnapshot[],
): LearningSignal[] {
  return history.flatMap((video) => deriveLearningSignals(video)).slice(-60);
}
