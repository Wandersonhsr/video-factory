# MAESTRA V2

Clean render worker for the projetos26 automation stack.

## Contract

- `GET /health` — public health check, no token required.
- `POST /jobs` — create render job.
- `GET /jobs/{id}` — job status.
- `GET /jobs/{id}/download` — MP4 output.

Protected routes use:

```
Authorization: Bearer <WORKER_TOKEN>
```

## Easypanel deployment

Create an app named **maestra-v2** from this repository/branch.

- Repository: `Wandersonhsr/video-factory`
- Branch: `maestra-v2`
- Build context: `/maestra-v2`
- Dockerfile: `Dockerfile`
- Internal port: `8080`
- Persistent volume: `/data`
- Env:
  - `WORKER_TOKEN=<new long random value>`
  - `DATA_DIR=/data`

The service-to-service URL expected inside project `projetos26` is:

```
http://projetos26_maestra-v2:8080
```

If Easypanel displays a different generated internal hostname, use the hostname shown by Easypanel and update the n8n workflow accordingly.

## n8n

Set on the n8n service:

```
MAESTRA_TOKEN=<same token as worker>
```

Import `n8n/maestra-v2-smoke-test.json` and run it manually.

Expected final result:

```json
{
  "status": "completed",
  "download_path": "/jobs/<id>/download"
}
```

## Direct smoke test

```bash
curl -fsS http://127.0.0.1:8080/health

curl -fsS -X POST http://127.0.0.1:8080/jobs \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"smoke","duration_seconds":5}'
```

The smoke job generates a real H.264/AAC MP4 using FFmpeg without any external media dependency.

## Persistence

Every job is stored under:

```
/data/jobs/<job-id>/
```

including request, status and `output.mp4`.
