from __future__ import annotations

import json
import os
import shutil
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, HttpUrl

DATA_DIR = Path(os.getenv("DATA_DIR", "/data"))
JOBS_DIR = DATA_DIR / "jobs"
WORKER_TOKEN = os.getenv("WORKER_TOKEN", "").strip()
JOBS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="MAESTRA Render Worker", version="2.0.0")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def auth(authorization: str | None = Header(default=None)) -> None:
    if not WORKER_TOKEN:
        return
    expected = f"Bearer {WORKER_TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


class JobRequest(BaseModel):
    mode: Literal["smoke", "render"] = "smoke"
    title: str = Field(default="maestra-job", max_length=200)
    duration_seconds: int = Field(default=5, ge=1, le=43200)
    image_url: HttpUrl | None = None
    audio_urls: list[HttpUrl] = Field(default_factory=list)
    width: int = Field(default=1920, ge=320, le=3840)
    height: int = Field(default=1080, ge=240, le=2160)
    fps: int = Field(default=30, ge=12, le=60)


def job_dir(job_id: str) -> Path:
    return JOBS_DIR / job_id


def status_path(job_id: str) -> Path:
    return job_dir(job_id) / "status.json"


def read_status(job_id: str) -> dict:
    p = status_path(job_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="job not found")
    return json.loads(p.read_text(encoding="utf-8"))


def write_status(job_id: str, **updates) -> dict:
    p = status_path(job_id)
    base = {}
    if p.exists():
        base = json.loads(p.read_text(encoding="utf-8"))
    base.update(updates)
    base["updated_at"] = now_iso()
    p.write_text(json.dumps(base, ensure_ascii=False, indent=2), encoding="utf-8")
    return base


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "ffmpeg failed")[-6000:]
        raise RuntimeError(err)


def download(url: str, out: Path) -> None:
    with httpx.stream("GET", url, follow_redirects=True, timeout=120.0) as r:
        r.raise_for_status()
        with out.open("wb") as f:
            for chunk in r.iter_bytes():
                f.write(chunk)


def render_smoke(job_id: str, req: JobRequest) -> Path:
    out = job_dir(job_id) / "output.mp4"
    run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c=black:s={req.width}x{req.height}:r={req.fps}",
        "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000",
        "-t", str(req.duration_seconds),
        "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-shortest",
        str(out),
    ])
    return out


def render_media(job_id: str, req: JobRequest) -> Path:
    if not req.image_url:
        raise RuntimeError("image_url is required when mode=render")
    if not req.audio_urls:
        raise RuntimeError("audio_urls is required when mode=render")

    d = job_dir(job_id)
    image = d / "image"
    download(str(req.image_url), image)

    audio_files: list[Path] = []
    for i, url in enumerate(req.audio_urls):
        p = d / f"audio_{i:03d}"
        download(str(url), p)
        audio_files.append(p)

    concat_file = d / "audio_concat.txt"
    concat_file.write_text(
        "\n".join(f"file '{p.as_posix()}'" for p in audio_files),
        encoding="utf-8",
    )

    audio_mix = d / "audio.m4a"
    run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-c:a", "aac", "-b:a", "192k",
        str(audio_mix),
    ])

    out = d / "output.mp4"
    run([
        "ffmpeg", "-y",
        "-loop", "1", "-i", str(image),
        "-i", str(audio_mix),
        "-vf", f"scale={req.width}:{req.height}:force_original_aspect_ratio=increase,crop={req.width}:{req.height},format=yuv420p",
        "-r", str(req.fps),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-movflags", "+faststart",
        str(out),
    ])
    return out


def process_job(job_id: str, req: JobRequest) -> None:
    try:
        write_status(job_id, status="processing", started_at=now_iso())
        out = render_smoke(job_id, req) if req.mode == "smoke" else render_media(job_id, req)
        size = out.stat().st_size
        write_status(
            job_id,
            status="completed",
            completed_at=now_iso(),
            output_file=str(out),
            output_size_bytes=size,
            download_path=f"/jobs/{job_id}/download",
        )
    except Exception as exc:
        write_status(job_id, status="failed", error=str(exc))


@app.get("/health")
def health() -> dict:
    ffmpeg = shutil.which("ffmpeg")
    return {
        "ok": True,
        "service": "maestra-v2",
        "version": "2.0.0",
        "ffmpeg": bool(ffmpeg),
        "data_dir": str(DATA_DIR),
        "time": now_iso(),
    }


@app.post("/jobs", dependencies=[Depends(auth)], status_code=202)
def create_job(req: JobRequest, background_tasks: BackgroundTasks) -> dict:
    job_id = uuid.uuid4().hex
    d = job_dir(job_id)
    d.mkdir(parents=True, exist_ok=False)
    payload = req.model_dump(mode="json")
    (d / "request.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_status(
        job_id,
        id=job_id,
        title=req.title,
        mode=req.mode,
        status="queued",
        created_at=now_iso(),
    )
    background_tasks.add_task(process_job, job_id, req)
    return {
        "id": job_id,
        "status": "queued",
        "status_path": f"/jobs/{job_id}",
        "download_path": f"/jobs/{job_id}/download",
    }


@app.get("/jobs/{job_id}", dependencies=[Depends(auth)])
def get_job(job_id: str) -> dict:
    return read_status(job_id)


@app.get("/jobs/{job_id}/download", dependencies=[Depends(auth)])
def download_job(job_id: str):
    status = read_status(job_id)
    if status.get("status") != "completed":
        raise HTTPException(status_code=409, detail=f"job status is {status.get('status')}")
    out = job_dir(job_id) / "output.mp4"
    if not out.exists():
        raise HTTPException(status_code=404, detail="output file not found")
    return FileResponse(out, media_type="video/mp4", filename=f"{job_id}.mp4")
