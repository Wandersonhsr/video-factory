"use client";

import { useMemo, useState } from "react";
import {
  calculateGoldScore,
  fortuneDecodedDefaults,
  type ManualSignals,
  type MarketEvidence,
} from "@/lib/gold-score";

type MarketVideo = {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  ageDays: number;
  views: number;
  viewsPerDay: number;
  durationSeconds: number;
  longForm: boolean;
};

const signalLabels: Array<[keyof ManualSignals, string]> = [
  ["advertiserValue", "Valor para anunciantes"],
  ["tier1Fit", "Fit Tier-1"],
  ["browsePotential", "Potencial de Browse"],
  ["storyPotential", "Força narrativa"],
  ["evergreen", "Evergreen"],
  ["competitionOpportunity", "Oportunidade vs competição"],
  ["productionEfficiency", "Eficiência de produção"],
  ["sponsorPotential", "Potencial de patrocinador"],
  ["affiliatePotential", "Potencial de afiliado"],
  ["policySafety", "Segurança de monetização"],
];

const starterTopics = [
  "How Visa Makes Money on Every Swipe",
  "The $1 Trillion Business Behind Credit Card Rewards",
  "Why Private Equity Keeps Buying Everything",
  "The Invisible Software Running the World's Banks",
  "How Insurance Companies Turn Risk Into Billions",
  "The Companies That Quietly Run the Internet",
];

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
};

export function GoldTopicEngine() {
  const [topic, setTopic] = useState(starterTopics[0]);
  const [manual, setManual] = useState<ManualSignals>(fortuneDecodedDefaults);
  const [rpmLow, setRpmLow] = useState(12);
  const [rpmHigh, setRpmHigh] = useState(35);
  const [monthlyViewsTarget, setMonthlyViewsTarget] = useState(5_000_000);
  const [evidence, setEvidence] = useState<MarketEvidence | null>(null);
  const [videos, setVideos] = useState<MarketVideo[]>([]);
  const [marketStatus, setMarketStatus] = useState<
    "idle" | "loading" | "complete" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const result = useMemo(
    () =>
      calculateGoldScore(
        manual,
        evidence,
        monthlyViewsTarget,
        rpmLow,
        rpmHigh,
      ),
    [manual, evidence, monthlyViewsTarget, rpmLow, rpmHigh],
  );

  const analyzeMarket = async () => {
    setMarketStatus("loading");
    setMessage("");
    setEvidence(null);
    setVideos([]);

    try {
      const response = await fetch("/api/gold-topics/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: topic,
          regionCode: "US",
          language: "en",
          publishedWithinDays: 730,
        }),
      });

      const payload = (await response.json()) as {
        evidence?: MarketEvidence | null;
        videos?: MarketVideo[];
        message?: string;
        error?: string;
        note?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Falha na análise.");
      }

      setEvidence(payload.evidence || null);
      setVideos(payload.videos || []);
      setMessage(payload.note || payload.message || "");
      setMarketStatus("complete");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao analisar o mercado.",
      );
      setMarketStatus("error");
    }
  };

  return (
    <main className="shell gold-shell">
      <header className="topbar">
        <div>
          <a className="brand brand-link" href="/">VYRAMO AI</a>
          <div className="tagline">
            Fortune Decoded · Gold Topic Engine
          </div>
        </div>
        <a className="top-link" href="/">VIDEO ENGINE</a>
      </header>

      <section className="gold-hero">
        <div>
          <div className="eyebrow">ATTENTION × COMMERCIAL VALUE</div>
          <h1>Encontre temas que merecem virar vídeo.</h1>
          <p className="muted gold-intro">
            O score não inventa RPM. Hipóteses comerciais ficam separadas dos
            dados públicos de mercado; CTR, retenção e receita real entram
            depois via YouTube Analytics do Fortune Decoded.
          </p>
        </div>

        <div className="gold-score-card">
          <span>GOLD SCORE</span>
          <strong>{result.goldScore}</strong>
          <small>/100 · {result.confidence === "market-backed" ? "market-backed" : "hipótese editorial"}</small>
        </div>
      </section>

      <section className="gold-grid">
        <div className="panel gold-panel">
          <div className="eyebrow">01 · TOPIC</div>
          <label className="field">
            <span>Tema / título de pesquisa</span>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              rows={3}
            />
          </label>

          <div className="starter-row">
            {starterTopics.slice(0, 3).map((candidate) => (
              <button
                className="topic-chip"
                key={candidate}
                onClick={() => {
                  setTopic(candidate);
                  setEvidence(null);
                  setVideos([]);
                  setMarketStatus("idle");
                }}
              >
                {candidate}
              </button>
            ))}
          </div>

          <button
            className="primary"
            onClick={() => void analyzeMarket()}
            disabled={marketStatus === "loading" || !topic.trim()}
          >
            {marketStatus === "loading"
              ? "MINERANDO YOUTUBE..."
              : "ANALISAR MARKET EVIDENCE"}
          </button>

          {message && (
            <div className={marketStatus === "error" ? "error-box" : "info-box"}>
              {message}
            </div>
          )}
        </div>

        <div className="panel gold-panel">
          <div className="eyebrow">02 · ECONOMICS</div>
          <div className="economics-grid">
            <label className="field">
              <span>Meta mensal de views</span>
              <input
                type="number"
                min={1000}
                step={100000}
                value={monthlyViewsTarget}
                onChange={(event) =>
                  setMonthlyViewsTarget(Math.max(1000, Number(event.target.value)))
                }
              />
            </label>
            <label className="field">
              <span>RPM hipótese — baixo (US$)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={rpmLow}
                onChange={(event) => setRpmLow(Math.max(0, Number(event.target.value)))}
              />
            </label>
            <label className="field">
              <span>RPM hipótese — alto (US$)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={rpmHigh}
                onChange={(event) => setRpmHigh(Math.max(0, Number(event.target.value)))}
              />
            </label>
          </div>

          <div className="revenue-strip">
            <div>
              <span>LOW</span>
              <strong>{formatMoney(result.revenue.low)}</strong>
            </div>
            <div>
              <span>MID</span>
              <strong>{formatMoney(result.revenue.mid)}</strong>
            </div>
            <div>
              <span>HIGH</span>
              <strong>{formatMoney(result.revenue.high)}</strong>
            </div>
          </div>

          <p className="microcopy">
            Cenário matemático = views ÷ 1.000 × RPM informado. Não é previsão
            de receita nem estimativa automática do YouTube.
          </p>
        </div>
      </section>

      <section className="panel gold-panel signals-panel">
        <div className="signals-header">
          <div>
            <div className="eyebrow">03 · EDITORIAL SIGNALS</div>
            <strong>Hipóteses controláveis pelo nosso time</strong>
          </div>
          <div className="score-pair">
            <span>Manual</span>
            <strong>{result.manualScore}</strong>
          </div>
        </div>

        <div className="signals-grid">
          {signalLabels.map(([key, label]) => (
            <label className="signal" key={key}>
              <div>
                <span>{label}</span>
                <strong>{manual[key]}</strong>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={manual[key]}
                onChange={(event) =>
                  setManual((current) => ({
                    ...current,
                    [key]: Number(event.target.value),
                  }))
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="gold-grid market-grid">
        <div className="panel gold-panel">
          <div className="signals-header">
            <div>
              <div className="eyebrow">04 · MARKET EVIDENCE</div>
              <strong>YouTube público · últimos 730 dias</strong>
            </div>
            <div className="score-pair">
              <span>Market</span>
              <strong>{result.marketScore ?? "—"}</strong>
            </div>
          </div>

          {evidence ? (
            <div className="evidence-grid">
              <div><span>Amostra</span><strong>{evidence.sampleSize}</strong></div>
              <div><span>Mediana views</span><strong>{formatCompact(evidence.medianViews)}</strong></div>
              <div><span>P90 views</span><strong>{formatCompact(evidence.p90Views)}</strong></div>
              <div><span>Mediana views/dia</span><strong>{formatCompact(evidence.medianViewsPerDay)}</strong></div>
              <div><span>Long-form share</span><strong>{Math.round(evidence.longFormShare * 100)}%</strong></div>
              <div><span>Duração mediana</span><strong>{formatDuration(evidence.medianDurationSeconds)}</strong></div>
              <div><span>Outlier ratio</span><strong>{evidence.outlierRatio}×</strong></div>
            </div>
          ) : (
            <div className="empty-market">
              Configure <code>YOUTUBE_API_KEY</code> para transformar hipótese
              editorial em evidência de mercado real.
            </div>
          )}
        </div>

        <div className="panel gold-panel">
          <div className="eyebrow">DECISION GATE</div>
          <div className="decision-score">{result.goldScore}</div>
          <div className="decision-copy">
            {result.goldScore >= 80
              ? "Forte candidato para pesquisa editorial e roteiro."
              : result.goldScore >= 65
                ? "Promissor, mas precisa de evidência ou refinamento."
                : "Não priorizar ainda. Reposicione o ângulo ou escolha outro tema."}
          </div>
          <div className="decision-rules">
            <span>≥ 80 · produzir pesquisa</span>
            <span>65–79 · investigar</span>
            <span>&lt; 65 · arquivar/reformular</span>
          </div>
        </div>
      </section>

      {videos.length > 0 && (
        <section className="panel gold-panel">
          <div className="eyebrow">MARKET SAMPLE</div>
          <div className="market-table-wrap">
            <table className="market-table">
              <thead>
                <tr>
                  <th>Vídeo</th>
                  <th>Views</th>
                  <th>Views/dia</th>
                  <th>Duração</th>
                  <th>Idade</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id}>
                    <td>
                      <strong>{video.title}</strong>
                      <span>{video.channelTitle}</span>
                    </td>
                    <td>{formatCompact(video.views)}</td>
                    <td>{formatCompact(video.viewsPerDay)}</td>
                    <td>{formatDuration(video.durationSeconds)}</td>
                    <td>{Math.round(video.ageDays)}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
