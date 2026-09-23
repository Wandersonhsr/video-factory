import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "reactor/helios";

export async function POST() {
  const apiKey = process.env.REACTOR_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "REACTOR_API_KEY_NOT_CONFIGURED",
        message: "Configure REACTOR_API_KEY on the server before generating video.",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch("https://api.reactor.inc/tokens", {
      method: "POST",
      headers: {
        "Reactor-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: 3600,
        authorization_details: [
          {
            type: "session",
            resources: { models: { match: [MODEL] } },
            constraints: { max_sessions: 2 },
          },
        ],
      }),
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "REACTOR_TOKEN_EXCHANGE_FAILED",
          upstream_status: response.status,
          detail: text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const payload = JSON.parse(text) as { jwt?: string };

    if (!payload.jwt) {
      return NextResponse.json(
        { error: "REACTOR_TOKEN_MISSING" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { jwt: payload.jwt, model: MODEL },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "REACTOR_TOKEN_ROUTE_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
