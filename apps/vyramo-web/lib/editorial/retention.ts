import type { PerformanceMoment } from "./types";

export type RetentionPoint = {
  elapsedRatio: number;
  audienceWatchRatio: number;
  relativeRetentionPerformance?: number;
};

export type RetentionCurveReport = {
  moments: PerformanceMoment[];
  retention30s?: number;
  finalRetention?: number;
  averageWatchRatio: number;
};

export function analyzeRetentionCurve(
  curve: RetentionPoint[],
  durationSeconds: number,
): RetentionCurveReport {
  const sorted = [...curve]
    .filter(
      (point) =>
        Number.isFinite(point.elapsedRatio) &&
        Number.isFinite(point.audienceWatchRatio),
    )
    .sort((a, b) => a.elapsedRatio - b.elapsedRatio);

  if (!sorted.length) {
    return {
      moments: [],
      averageWatchRatio: 0,
    };
  }

  const moments: PerformanceMoment[] = [];
  const window = 3;

  for (let index = window; index < sorted.length - window; index += 1) {
    const current = sorted[index];
    const before =
      sorted
        .slice(index - window, index)
        .reduce((sum, point) => sum + point.audienceWatchRatio, 0) / window;
    const after =
      sorted
        .slice(index + 1, index + window + 1)
        .reduce((sum, point) => sum + point.audienceWatchRatio, 0) / window;

    const deltaPoints = (after - before) * 100;
    const second = Math.round(current.elapsedRatio * durationSeconds);

    if (deltaPoints <= -6) {
      moments.push({
        second,
        type: "dip",
        delta: Math.round(deltaPoints * 10) / 10,
      });
    } else if (deltaPoints >= 4) {
      moments.push({
        second,
        type: "spike",
        delta: Math.round(deltaPoints * 10) / 10,
      });
    }

    if (
      current.relativeRetentionPerformance !== undefined &&
      current.relativeRetentionPerformance >= 0.8
    ) {
      moments.push({
        second,
        type: "top",
        note: "Relative retention performance >= 0.8",
      });
    }
  }

  const closestToRatio = (ratio: number) =>
    sorted.reduce((best, point) =>
      Math.abs(point.elapsedRatio - ratio) <
      Math.abs(best.elapsedRatio - ratio)
        ? point
        : best,
    );

  const retention30Ratio =
    durationSeconds > 0 ? Math.min(1, 30 / durationSeconds) : 0;
  const retention30s =
    durationSeconds >= 30
      ? closestToRatio(retention30Ratio).audienceWatchRatio * 100
      : undefined;

  const finalRetention =
    sorted[sorted.length - 1].audienceWatchRatio * 100;

  const averageWatchRatio =
    (sorted.reduce((sum, point) => sum + point.audienceWatchRatio, 0) /
      sorted.length) *
    100;

  const deduped = moments.filter(
    (moment, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.type === moment.type &&
          Math.abs(candidate.second - moment.second) <=
            Math.max(2, Math.round(durationSeconds * 0.015)),
      ) === index,
  );

  return {
    moments: deduped,
    retention30s:
      retention30s === undefined
        ? undefined
        : Math.round(retention30s * 10) / 10,
    finalRetention: Math.round(finalRetention * 10) / 10,
    averageWatchRatio: Math.round(averageWatchRatio * 10) / 10,
  };
}
