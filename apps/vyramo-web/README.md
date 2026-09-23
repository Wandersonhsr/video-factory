# Vyramo AI — Video Engine V1

First production slice of Vyramo's provider-based video engine.

## What works in this slice

- Secure server-side exchange of `REACTOR_API_KEY` for a short-lived, model-scoped JWT.
- Real Reactor Helios WebRTC session.
- Prompt → live AI video stream.
- Runtime prompt steering without restarting the session.
- Economy / Balanced / Premium super-resolution routing.
- Timed generation proofs (8–30 seconds).
- Browser capture of the generated stream.
- MP4 download when the browser exposes an MP4 MediaRecorder codec; WebM fallback otherwise.
- Provider routing contract prepared for H3 Reference, FastH3, LTX and X2.
- Responsive desktop/mobile UI and installable web-app manifest.

## Run locally

```bash
cd apps/vyramo-web
npm install
cp .env.example .env.local
# set REACTOR_API_KEY in .env.local
npm run dev
```

Open http://localhost:3000.

## Production

Deploy `apps/vyramo-web` as the Vercel project root and add `REACTOR_API_KEY` as a server-side environment variable.

Do not expose the API key as `NEXT_PUBLIC_REACTOR_API_KEY`.

## Current quality gate

A build is considered operational only when:

1. `POST /api/reactor/token` returns a scoped JWT.
2. Helios connects.
3. `setPrompt` is accepted.
4. `start` emits live `main_video`.
5. The browser records non-zero bytes.
6. The resulting file is playable.

## Next adapter

The next engineering slice is the render bridge: persist the captured stream, feed the existing `video-factory` FFmpeg/Remotion worker, normalize to H.264/AAC MP4, then store project/job metadata in Supabase.
