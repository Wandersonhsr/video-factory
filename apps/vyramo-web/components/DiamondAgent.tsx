"use client";

import { useState } from "react";
import { DIAMOND_AGENT_PIPELINE } from "@/lib/editorial/prompts";
import type { BenchmarkVideo } from "@/lib/editorial/types";

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
};

export function DiamondAgent() {
  const [niche, setNiche] = useState(
    "business empires finance technology money systems",
  );
  const [days, setDays] = useState(180);
  const [minSubscribers, setMinSubscribers] = useState(30_000_000);
  const [benchmarks, setBenchmarks] = useState<BenchmarkVideo[]>([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "loading" | "complete" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const discover = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/diamond/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          days,
          minSubscribers,
          regionCode: "US",
          language: "en",
        }),
      });

      const payload = (await response.json()) as {
        benchmarks?: BenchmarkVideo[];
        eligibleCount?: number;
        message?: string;
        error?: string;
        methodology?: { caution?: string };
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Discovery failed.");
      }

      setBenchmarks(payload.benchmarks || []);
      setEligibleCount(payload.eligibleCount || 0);
      setMessage(payload.methodology?.caution || "");
      setStatus("complete");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao minerar benchmarks.",
      );
      setStatus("error");
    }
  };

  return (
    <main className="shell diamond-shell">
      <header className="topbar">
        <div>
          <a className="brand brand-link" href="/">VYRAMO AI</a>
          <div className="tagline">
            Fortune Decoded · Diamond Editorial Agent
          </div>
        </div>
        <div className="diamond-nav">
          <a className="top-link" href="/gold">GOLD TOPICS</a>
          <a className="top-link" href="/">VIDEO ENGINE</a>
        </div>
      </header>

      <section className="diamond-hero panel">
        <div>
          <div className="eyebrow">DISCOVER → REBUILD → VALIDATE → LEARN</div>
          <h1>Agente editorial com quality gate 95+.</h1>
          <p className="muted diamond-intro">
            Minera velocidade real de audiência, decompõe mecanismos sem copiar,
            reconstrói hook, storytelling, roteiro, visual e packaging, passa por
            auditoria de monetização e por um CEO crítico antes da produção.
          </p>
        </div>
        <div className="diamond-badge">
          <span>FINAL GATE</span>
          <strong>95+</strong>
          <small>sem blockers críticos</small>
        </div>
      </section>

      <section className="gold-grid">
        <div className="panel gold-panel">
          <div className="eyebrow">01 · NICHE MINER</div>

          <label className="field">
            <span>Nicho / cluster temático</span>
            <textarea
              rows={3}
              value={niche}
              onChange={(event) => setNiche(event.target.value)}
            />
          </label>

          <div className="economics-grid">
            <label className="field">
              <span>Janela</span>
              <select
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
              >
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
                <option value={180}>180 dias</option>
                <option value={365}>365 dias</option>
                <option value={730}>730 dias</option>
              </select>
            </label>

            <label className="field">
              <span>Benchmark mínimo</span>
              <select
                value={minSubscribers}
                onChange={(event) =>
                  setMinSubscribers(Number(event.target.value))
                }
              >
                <option value={1000000}>1M inscritos</option>
                <option value={5000000}>5M inscritos</option>
                <option value={10000000}>10M inscritos</option>
                <option value={30000000}>30M inscritos</option>
              </select>
            </label>
          </div>

          <button
            className="primary"
            disabled={status === "loading" || !niche.trim()}
            onClick={() => void discover()}
          >
            {status === "loading"
              ? "MINERANDO..."
              : "MINERAR CANAIS E VÍDEOS"}
          </button>

          {message && (
            <div className={status === "error" ? "error-box" : "info-box"}>
              {message}
            </div>
          )}
        </div>

        <div className="panel gold-panel">
          <div className="eyebrow">02 · DIAMOND PIPELINE</div>
          <div className="agent-pipeline">
            {DIAMOND_AGENT_PIPELINE.map((stage, index) => (
              <div className="agent-stage" key={stage}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{stage}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel gold-panel diamond-method">
        <div className="eyebrow">OPPORTUNITY LOGIC</div>
        <div className="diamond-metrics">
          <div><strong>45%</strong><span>Views/dia</span></div>
          <div><strong>25%</strong><span>Breakout vs inscritos</span></div>
          <div><strong>15%</strong><span>Recência</span></div>
          <div><strong>10%</strong><span>Long-form</span></div>
          <div><strong>5%</strong><span>Autoridade do canal</span></div>
        </div>
        <p className="microcopy">
          Inscritos altos são referência, não causalidade. O ranking prioriza
          velocidade e breakout para evitar copiar apenas o que já é grande.
        </p>
      </section>

      {status === "complete" && (
        <section className="panel gold-panel">
          <div className="signals-header">
            <div>
              <div className="eyebrow">BENCHMARK SET</div>
              <strong>{benchmarks.length} vídeos analisados</strong>
            </div>
            <div className="score-pair">
              <span>≥ benchmark</span>
              <strong>{eligibleCount}</strong>
            </div>
          </div>

          <div className="market-table-wrap">
            <table className="market-table diamond-table">
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Vídeo / Canal</th>
                  <th>Views</th>
                  <th>Views/dia</th>
                  <th>Views/Sub</th>
                  <th>Duração</th>
                  <th>Benchmark</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((video) => (
                  <tr key={video.videoId}>
                    <td>
                      <strong className="opportunity-number">
                        {video.opportunityScore}
                      </strong>
                    </td>
                    <td>
                      <strong>{video.title}</strong>
                      <span>
                        {video.channelTitle} · {formatCompact(video.subscribers)} subs
                      </span>
                    </td>
                    <td>{formatCompact(video.views)}</td>
                    <td>{formatCompact(video.viewsPerDay)}</td>
                    <td>{video.viewToSubscriberRatio}×</td>
                    <td>{formatDuration(video.durationSeconds)}</td>
                    <td>
                      <span
                        className={
                          video.eligibleDiamondChannel
                            ? "ready-chip"
                            : "queued-chip"
                        }
                      >
                        {video.eligibleDiamondChannel ? "DIAMOND" : "SIGNAL"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="gold-grid diamond-bottom">
        <div className="panel gold-panel">
          <div className="eyebrow">QUALITY GATE · 100 POINTS</div>
          <div className="quality-list">
            <div><span>Hook</span><strong>15</strong></div>
            <div><span>Story architecture</span><strong>18</strong></div>
            <div><span>Retention design</span><strong>15</strong></div>
            <div><span>Originality</span><strong>15</strong></div>
            <div><span>Value density</span><strong>10</strong></div>
            <div><span>Visual narrative</span><strong>8</strong></div>
            <div><span>Packaging + SEO</span><strong>8</strong></div>
            <div><span>Monetization safety</span><strong>6</strong></div>
            <div><span>Evidence integrity</span><strong>5</strong></div>
          </div>
        </div>

        <div className="panel gold-panel">
          <div className="eyebrow">ADAPTIVE MEMORY</div>
          <h2 className="adaptive-title">
            Cada vídeo vira treinamento operacional.
          </h2>
          <p className="muted">
            CTR, 30s retention, average percentage viewed, final retention,
            dips, spikes, RPM e receita alimentam sinais de melhoria. O agente
            reutiliza mecanismos vencedores, não textos ou templates.
          </p>
          <div className="decision-rules">
            <span>CTR ruim + retenção boa → packaging</span>
            <span>CTR bom + queda 0–30s → promessa/hook</span>
            <span>Dip local → cena/texto/voz/transição</span>
            <span>Spike/top moment → mecanismo a explorar</span>
            <span>RPM real → calibração econômica do tema</span>
          </div>
        </div>
      </section>
    </main>
  );
}
