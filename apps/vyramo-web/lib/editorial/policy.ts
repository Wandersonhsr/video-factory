export const YOUTUBE_POLICY_BASELINE = {
  reviewedAt: "2026-09-23",
  principles: [
    "Original and authentic value must be evident at channel and video level.",
    "Mass-produced, generic, repetitive, or interchangeable content is a monetization risk.",
    "Reused source material requires significant original commentary, modification, education, or entertainment value.",
    "Metadata and packaging must accurately represent the video.",
    "Rights and licensing must be traceable for source assets.",
  ],
  officialReferences: [
    "https://support.google.com/youtube/answer/1311392",
    "https://support.google.com/youtube/answer/9314415",
    "https://support.google.com/youtube/answer/16391400",
  ],
} as const;

export function isPolicyBaselineStale(now = new Date()) {
  const reviewed = new Date(`${YOUTUBE_POLICY_BASELINE.reviewedAt}T00:00:00Z`);
  const ageDays = (now.getTime() - reviewed.getTime()) / 86400_000;
  return ageDays > 30;
}
