from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .easypanel import EasypanelClient

DATA_DIR = Path(os.getenv("AGENCY_DATA_DIR", "/data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "agency.db"

app = FastAPI(title="Soberano Agency OS", version="0.1.0")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db() as conn:
        conn.executescript("""
        create table if not exists jobs (
          id text primary key,
          title text not null,
          goal text not null,
          status text not null,
          current_agent text,
          context text not null,
          created_at text not null,
          updated_at text not null
        );
        create table if not exists events (
          id integer primary key autoincrement,
          job_id text not null,
          agent text,
          event_type text not null,
          payload text not null,
          created_at text not null
        );
        create table if not exists gates (
          id integer primary key autoincrement,
          job_id text not null,
          gate_name text not null,
          status text not null,
          evidence text not null,
          checked_at text not null
        );
        """)


init_db()


class CreateJob(BaseModel):
    title: str
    goal: str
    context: dict[str, Any] = Field(default_factory=dict)


class EasypanelRepairRequest(BaseModel):
    job_id: str | None = None
    project: str
    service: str
    owner: str = "Wandersonhsr"
    repo: str = "video-factory"
    ref: str
    path: str = "/"
    env: str = ""


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "soberano-agency-os", "version": "0.1.0", "time": now()}


@app.post("/jobs")
def create_job(req: CreateJob) -> dict[str, Any]:
    job_id = uuid.uuid4().hex
    ts = now()
    with db() as conn:
        conn.execute(
            "insert into jobs(id,title,goal,status,current_agent,context,created_at,updated_at) values(?,?,?,?,?,?,?,?)",
            (job_id, req.title, req.goal, "queued", "orchestrator", json.dumps(req.context), ts, ts),
        )
        conn.execute(
            "insert into events(job_id,agent,event_type,payload,created_at) values(?,?,?,?,?)",
            (job_id, "orchestrator", "job.created", json.dumps(req.model_dump()), ts),
        )
    return {"id": job_id, "status": "queued", "current_agent": "orchestrator"}


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("select * from jobs where id=?", (job_id,)).fetchone()
        if not row:
            raise HTTPException(404, "job not found")
        events = [dict(x) for x in conn.execute("select * from events where job_id=? order by id", (job_id,)).fetchall()]
        gates = [dict(x) for x in conn.execute("select * from gates where job_id=? order by id", (job_id,)).fetchall()]
    result = dict(row)
    result["context"] = json.loads(result["context"])
    for e in events:
        e["payload"] = json.loads(e["payload"])
    for g in gates:
        g["evidence"] = json.loads(g["evidence"])
    result["events"] = events
    result["gates"] = gates
    return result


@app.post("/agents/devops/easypanel/configure-and-deploy")
async def easypanel_configure_and_deploy(req: EasypanelRepairRequest) -> dict[str, Any]:
    client = EasypanelClient()
    before = await client.inspect_app(req.project, req.service)
    await client.use_github_source(req.project, req.service, req.owner, req.repo, req.ref, req.path)
    if req.env:
        await client.set_env(req.project, req.service, req.env)
    await client.deploy(req.project, req.service, True)
    after = await client.inspect_app(req.project, req.service)

    evidence = {
        "source_configured": True,
        "deployment_triggered": True,
        "before": before,
        "after": after,
    }

    if req.job_id:
        with db() as conn:
            ts = now()
            conn.execute("update jobs set status=?, current_agent=?, updated_at=? where id=?",
                         ("running", "devops", ts, req.job_id))
            conn.execute(
                "insert into events(job_id,agent,event_type,payload,created_at) values(?,?,?,?,?)",
                (req.job_id, "devops", "easypanel.deployment_triggered", json.dumps(evidence), ts),
            )

    return evidence
