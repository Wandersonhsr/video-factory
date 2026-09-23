import type { DocumentaryScriptOutput } from "./documentary-script";

export type StoryboardExport = {
  title: string;
  mode: "dynamic";
  scenes: Array<{ sceneId: string; script: string; visualDirection: string; sourceIds: string[]; ctaId?: string }>;
  metadata: { source: "vyramo-documentary-engine"; nextVideoQuestion: string; thumbnailConcept: string };
};

export function toStoryboardExport(output: DocumentaryScriptOutput): StoryboardExport {
  return {
    title: output.titulo,
    mode: "dynamic",
    scenes: output.storyboard.map((scene) => ({ sceneId: scene.scene_id, script: scene.narration, visualDirection: scene.visual_direction, sourceIds: scene.source_ids, ctaId: scene.cta_id })),
    metadata: { source: "vyramo-documentary-engine", nextVideoQuestion: output.gancho_proximo_video, thumbnailConcept: output.thumbnail_sugestao }
  };
}

export type SynthesiaTemplatePayload = { templateId: string; title: string; description: string; templateData: Record<string, string> };

export function toSynthesiaTemplatePayload(output: DocumentaryScriptOutput, templateId: string): SynthesiaTemplatePayload {
  const templateData: Record<string, string> = { VIDEO_TITLE: output.titulo, THUMBNAIL_CONCEPT: output.thumbnail_sugestao, NEXT_VIDEO_QUESTION: output.gancho_proximo_video };
  output.storyboard.forEach((scene, index) => {
    const position = String(index + 1).padStart(3, "0");
    templateData["SCENE_" + position + "_SCRIPT"] = scene.narration;
    templateData["SCENE_" + position + "_VISUAL"] = scene.visual_direction;
  });
  return { templateId, title: output.titulo, description: output.seo.description, templateData };
}