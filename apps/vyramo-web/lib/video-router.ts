export type VideoIntent =
  | "ambient"
  | "long_video"
  | "cinematic"
  | "ugc"
  | "avatar"
  | "remodel";

export type VideoProviderId =
  | "reactor-helios"
  | "reactor-fast-h3"
  | "reactor-h3-reference"
  | "reactor-ltx"
  | "reactor-x2";

export type RouteDecision = {
  provider: VideoProviderId;
  model: string;
  readyInV1: boolean;
  reason: string;
};

export function routeVideoIntent(intent: VideoIntent): RouteDecision {
  switch (intent) {
    case "ambient":
    case "long_video":
    case "cinematic":
      return {
        provider: "reactor-helios",
        model: "reactor/helios",
        readyInV1: true,
        reason: "Continuous prompt-steerable generation is the V1 production path.",
      };
    case "ugc":
      return {
        provider: "reactor-h3-reference",
        model: "reactor/h3-reference-to-video-turbo-realtime",
        readyInV1: false,
        reason: "Reserved for the next provider adapter because it supports reference-guided video plus audio.",
      };
    case "avatar":
      return {
        provider: "reactor-ltx",
        model: "reactor/ltx2",
        readyInV1: false,
        reason: "Reserved for the avatar/lip-sync provider adapter.",
      };
    case "remodel":
      return {
        provider: "reactor-x2",
        model: "xmax/x2",
        readyInV1: false,
        reason: "Reserved for the video-to-video remodel adapter.",
      };
  }
}
