import { NextResponse } from "next/server";
import type { MarketEvidence } from "@/lib/gold-score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type YouTubeSearchItem = {
  id?: { videoId?: string };
};

type YouTubeVideoItem = {
  id: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
  };
  statistics?: {
    viewCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
};

const parseIsoDuration = (duration = "PT0S") => {
  const match = duration.match(
    /P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/,
  );
  if (!match) return 0;

  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days || 0) * 86400 +
    Number(hours || 0) * 3600 +
    Number(minutes || 0) * 60 +
    Number(seconds || 0)
  );
};

const percentile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p * sorted.length) - 1),
  );
  return sorted[index];
};

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

export async function POST(request: Request) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "YOUTUBE_API_KEY_NOT_CONFIGURED",
        message:
          "Configure YOUTUBE_API_KEY no servidor para ativar Market Evidence real. O Gold Score manual continua funcionando sem a chave.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    query?: string;
    regionCode?: string;
    language?: string;
    publishedWithinDays?: number;
  };

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "QUERY_REQUIRED", message: "Informe um tema para pesquisar." },
      { status: 400 },
    );
  }

  const regionCode = (body.regionCode || "US").toUpperCase().slice(0, 2);
  const language = (body.language || "en").slice(0, 5);
  const publishedWithinDays = Math.min(
    3650,
    Math.max(30, body.publishedWithinDays || 730),
  );

  const publishedAfter = new Date(
    Date.now() - publishedWithinDays * 86400 * 1000,
  ).toISOString();

  const searchParams = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: "25",
    order: "viewCount",
    regionCode,
    relevanceLanguage: language,
    publishedAfter,
    key: apiKey,
  });

  const searchResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
    { cache: "no-store" },
  );

  if (!searchResponse.ok) {
    const detail = await searchResponse.text();
    return NextResponse.json(
      {
        error: "YOUTUBE_SEARCH_FAILED",
        upstreamStatus: searchResponse.status,
        detail: detail.slice(0, 500),
      },
      { status: 502 },
    );
  }

  const searchPayload = (await searchResponse.json()) as {
    items?: YouTubeSearchItem[];
  };

  const ids = (searchPayload.items || [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));

  if (!ids.length) {
    return NextResponse.json({
      query,
      evidence: null,
      videos: [],
      message: "Nenhum vídeo encontrado para esse tema na janela escolhida.",
    });
  }

  const videosParams = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: ids.join(","),
    key: apiKey,
  });

  const videosResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${videosParams}`,
    { cache: "no-store" },
  );

  if (!videosResponse.ok) {
    const detail = await videosResponse.text();
    return NextResponse.json(
      {
        error: "YOUTUBE_VIDEO_DETAILS_FAILED",
        upstreamStatus: videosResponse.status,
        detail: detail.slice(0, 500),
      },
      { status: 502 },
    );
  }

  const videosPayload = (await videosResponse.json()) as {
    items?: YouTubeVideoItem[];
  };

  const now = Date.now();
  const videos = (videosPayload.items || [])
    .map((video) => {
      const publishedAt = video.snippet?.publishedAt || new Date().toISOString();
      const ageDays = Math.max(
        1,
        (now - new Date(publishedAt).getTime()) / 86400_000,
      );
      const views = Number(video.statistics?.viewCount || 0);
      const durationSeconds = parseIsoDuration(video.contentDetails?.duration);

      return {
        id: video.id,
        title: video.snippet?.title || "Untitled",
        channelTitle: video.snippet?.channelTitle || "Unknown",
        publishedAt,
        ageDays: Math.round(ageDays * 10) / 10,
        views,
        viewsPerDay: Math.round(views / ageDays),
        durationSeconds,
        longForm: durationSeconds >= 480,
      };
    })
    .filter((video) => video.views > 0);

  const viewCounts = videos.map((video) => video.views);
  const velocities = videos.map((video) => video.viewsPerDay);
  const durations = videos.map((video) => video.durationSeconds);
  const medianViews = median(viewCounts);
  const p90Views = percentile(viewCounts, 0.9);

  const evidence: MarketEvidence = {
    sampleSize: videos.length,
    medianViews: Math.round(medianViews),
    p90Views: Math.round(p90Views),
    medianViewsPerDay: Math.round(median(velocities)),
    longFormShare: videos.length
      ? videos.filter((video) => video.longForm).length / videos.length
      : 0,
    medianDurationSeconds: Math.round(median(durations)),
    outlierRatio:
      medianViews > 0
        ? Math.round((p90Views / medianViews) * 100) / 100
        : 0,
  };

  return NextResponse.json(
    {
      query,
      regionCode,
      language,
      publishedWithinDays,
      evidence,
      videos: videos.slice(0, 12),
      note:
        "Market Evidence usa dados públicos do YouTube. RPM, retenção, CTR e receita real exigem YouTube Analytics do canal e não são inferidos aqui.",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
