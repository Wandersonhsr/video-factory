import { NextResponse } from "next/server";
import type { BenchmarkVideo } from "@/lib/editorial/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchItem = {
  id?: { videoId?: string };
};

type VideoItem = {
  id: string;
  snippet?: {
    title?: string;
    channelId?: string;
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

type ChannelItem = {
  id: string;
  statistics?: {
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
  };
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

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

const logScore = (value: number, floor: number, ceiling: number) => {
  if (value <= floor) return 0;
  if (value >= ceiling) return 100;
  const low = Math.log10(floor + 1);
  const high = Math.log10(ceiling + 1);
  const current = Math.log10(value + 1);
  return clamp(((current - low) / (high - low)) * 100);
};

export async function POST(request: Request) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "YOUTUBE_API_KEY_NOT_CONFIGURED",
        message:
          "Configure YOUTUBE_API_KEY no servidor para minerar benchmarks públicos do YouTube.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    niche?: string;
    regionCode?: string;
    language?: string;
    days?: number;
    minSubscribers?: number;
  };

  const niche = body.niche?.trim();
  if (!niche) {
    return NextResponse.json(
      { error: "NICHE_REQUIRED", message: "Informe um nicho ou assunto." },
      { status: 400 },
    );
  }

  const regionCode = (body.regionCode || "US").toUpperCase().slice(0, 2);
  const language = (body.language || "en").slice(0, 5);
  const days = Math.min(3650, Math.max(7, body.days || 180));
  const minSubscribers = Math.max(0, body.minSubscribers ?? 30_000_000);
  const publishedAfter = new Date(
    Date.now() - days * 86400_000,
  ).toISOString();

  const searchParams = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: niche,
    maxResults: "50",
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
    return NextResponse.json(
      {
        error: "YOUTUBE_SEARCH_FAILED",
        detail: (await searchResponse.text()).slice(0, 500),
      },
      { status: 502 },
    );
  }

  const searchPayload = (await searchResponse.json()) as {
    items?: SearchItem[];
  };

  const ids = (searchPayload.items || [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));

  if (!ids.length) {
    return NextResponse.json({ niche, benchmarks: [], eligibleCount: 0 });
  }

  const videoParams = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: ids.join(","),
    key: apiKey,
  });

  const videoResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${videoParams}`,
    { cache: "no-store" },
  );

  if (!videoResponse.ok) {
    return NextResponse.json(
      {
        error: "YOUTUBE_VIDEOS_FAILED",
        detail: (await videoResponse.text()).slice(0, 500),
      },
      { status: 502 },
    );
  }

  const videoPayload = (await videoResponse.json()) as {
    items?: VideoItem[];
  };

  const channelIds = Array.from(
    new Set(
      (videoPayload.items || [])
        .map((video) => video.snippet?.channelId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const channelParams = new URLSearchParams({
    part: "statistics",
    id: channelIds.join(","),
    key: apiKey,
  });

  const channelResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${channelParams}`,
    { cache: "no-store" },
  );

  if (!channelResponse.ok) {
    return NextResponse.json(
      {
        error: "YOUTUBE_CHANNELS_FAILED",
        detail: (await channelResponse.text()).slice(0, 500),
      },
      { status: 502 },
    );
  }

  const channelPayload = (await channelResponse.json()) as {
    items?: ChannelItem[];
  };

  const subscriberMap = new Map(
    (channelPayload.items || []).map((channel) => [
      channel.id,
      channel.statistics?.hiddenSubscriberCount
        ? 0
        : Number(channel.statistics?.subscriberCount || 0),
    ]),
  );

  const now = Date.now();

  const benchmarks: BenchmarkVideo[] = (videoPayload.items || [])
    .map((video) => {
      const channelId = video.snippet?.channelId || "";
      const subscribers = subscriberMap.get(channelId) || 0;
      const publishedAt =
        video.snippet?.publishedAt || new Date().toISOString();
      const ageDays = Math.max(
        1,
        (now - new Date(publishedAt).getTime()) / 86400_000,
      );
      const views = Number(video.statistics?.viewCount || 0);
      const viewsPerDay = views / ageDays;
      const durationSeconds = parseIsoDuration(video.contentDetails?.duration);
      const viewToSubscriberRatio =
        subscribers > 0 ? views / subscribers : 0;

      const velocityScore = logScore(viewsPerDay, 100, 500_000);
      const breakoutScore = logScore(viewToSubscriberRatio, 0.01, 2);
      const freshnessScore = clamp((1 - ageDays / days) * 100);
      const longFormScore = durationSeconds >= 480 ? 100 : 35;
      const authorityScore =
        subscribers >= minSubscribers
          ? 100
          : logScore(subscribers, 100_000, minSubscribers || 30_000_000);

      const opportunityScore =
        velocityScore * 0.45 +
        breakoutScore * 0.25 +
        freshnessScore * 0.15 +
        longFormScore * 0.10 +
        authorityScore * 0.05;

      return {
        videoId: video.id,
        title: video.snippet?.title || "Untitled",
        channelId,
        channelTitle: video.snippet?.channelTitle || "Unknown",
        subscribers,
        publishedAt,
        ageDays: Math.round(ageDays * 10) / 10,
        views,
        viewsPerDay: Math.round(viewsPerDay),
        durationSeconds,
        longForm: durationSeconds >= 480,
        viewToSubscriberRatio:
          Math.round(viewToSubscriberRatio * 1000) / 1000,
        eligibleDiamondChannel: subscribers >= minSubscribers,
        opportunityScore: Math.round(opportunityScore * 10) / 10,
      };
    })
    .filter((video) => video.views > 0)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  return NextResponse.json(
    {
      niche,
      regionCode,
      language,
      days,
      minSubscribers,
      eligibleCount: benchmarks.filter(
        (video) => video.eligibleDiamondChannel,
      ).length,
      benchmarks: benchmarks.slice(0, 30),
      methodology: {
        opportunityScore:
          "45% views/day velocity + 25% view/subscriber breakout + 15% freshness + 10% long-form + 5% channel authority",
        caution:
          "Public YouTube data indicates demand and velocity, not causality, private RPM, CTR, or retention.",
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
