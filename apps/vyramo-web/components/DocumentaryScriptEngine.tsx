"use client";

import { useMemo, useState } from "react";
import { FORTUNE_DECODED_CHANNEL_LAWS, buildDocumentaryBrief } from "@/lib/editorial/documentary-script";

export function DocumentaryScriptEngine() {
  const [fact, setFact] = useState("Visa can earn money from card payments without lending the customer the purchase amount.");
  const [angle, setAngle] = useState("The invisible payment infrastructure and where the money flows.");
  const [previousVideo, setPreviousVideo] = useState("");
  const [duration, setDuration] = useState(9);
  const [language, setLanguage] = useState("English");

  const brief = useMemo(() => buildDocumentaryBrief({ fato_central: fact, angulo: angle, video_anterior: previousVideo, duracao_alvo: duration, idioma: language, publico: "Tier-1 adults interested in money, business and technology" }), [fact, angle, previousVideo, duration, language]);

  return (
    <main className="shell documentary-shell">
      <header className="topbar">
        <div>
          <a className="brand brand-link" href="/">VYRAMO AI</a>
          <div className="tagline">Fortune Decoded · Documentary Script Engine</div>
        </div>
        <div className="diamond-nav">
          <a className="top-link" href="/diamond">DIAMOND AGENT</a>
          <a className="top-link" href="/gold">GOLD TOPICS</a>
        </div>
      </header>

      <section className="panel documentary-hero">
        <div>
          <div className="eyebrow">STORYBOARD-FIRST · RETENTION-FIRST</div>
          <h1>Um fato. Um ângulo. Uma história impossível de confundir.</h1>
          <p className="muted">A arquitetura cruza fato + ângulo + intenção real de busca, preserva continuidade de série e obriga o roteiro a passar por evidência, ritmo, CTA e próximo-vídeo antes do render.</p>
        </div>
        <div className="documentary-gate">
          <span>QUALITY GATE</span>
          <strong>{FORTUNE_DECODED_CHANNEL_LAWS.qualityGate}+</strong>
          <small>e zero blockers factuais</small>
        </div>
      </section>

      <section className="gold-grid">
        <div className="panel gold-panel">
          <div className="eyebrow">INPUT CONTRACT</div>
          <label className="field"><span>Fato central</span><textarea rows={4} value={fact} onChange={(event) => setFact(event.target.value)} /></label>
          <label className="field"><span>Ângulo</span><textarea rows={3} value={angle} onChange={(event) => setAngle(event.target.value)} /></label>
          <label className="field"><span>Vídeo anterior da série</span><textarea rows={3} value={previousVideo} onChange={(event) => setPreviousVideo(event.target.value)} placeholder="Resumo factual para continuidade, sem repetir conteúdo." /></label>
          <div className="economics-grid">
            <label className="field"><span>Duração alvo</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={8}>8 min</option><option value={9}>9 min</option><option value={10}>10 min</option><option value={15}>15 min</option><option value={20}>20 min</option><option value={30}>30 min</option></select></label>
            <label className="field"><span>Idioma</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="English">English</option><option value="Portuguese (Brazil)">Português BR</option><option value="Spanish">Español</option></select></label>
          </div>
        </div>

        <div className="panel gold-panel">
          <div className="eyebrow">TIMING ENGINE</div>
          <div className="documentary-timeline">
            {Object.entries(brief.timing).filter(([key]) => !["totalSeconds", "tensionCheckSeconds"].includes(key)).map(([key, value]) => (
              <div key={key}><span>{key.replaceAll("_", " ")}</span><strong>{String(value)}</strong></div>
            ))}
          </div>
          <div className="tension-row"><span>TENSION CHECKS</span><div>{brief.timing.tensionCheckSeconds.map((second) => <strong key={second}>{Math.floor(second / 60)}:{String(second % 60).padStart(2, "0")}</strong>)}</div></div>
        </div>
      </section>

      <section className="panel gold-panel">
        <div className="eyebrow">CHANNEL LAWS</div>
        <div className="laws-grid">
          {FORTUNE_DECODED_CHANNEL_LAWS.narrativeRules.map((rule, index) => <div key={rule}><span>{String(index + 1).padStart(2, "0")}</span><strong>{rule}</strong></div>)}
        </div>
      </section>

      <section className="gold-grid documentary-bottom">
        <div className="panel gold-panel">
          <div className="eyebrow">CTA ENGINE</div>
          <p className="muted">CTA deixa de ser interrupção e vira consequência do valor já entregue. O sistema bloqueia pedido precoce e empilhamento de inscrições, likes, comentários e compartilhamento.</p>
          <div className="decision-rules">{FORTUNE_DECODED_CHANNEL_LAWS.ctaRules.map((rule) => <span key={rule}>{rule}</span>)}</div>
        </div>

        <div className="panel gold-panel">
          <div className="eyebrow">ALSOASKED PATTERN → VYRAMO</div>
          <div className="agent-pipeline">
            {["Root Query", "PAA Intent Graph", "Intent Clusters", "Micro-hooks / FAQ Gaps", "Adjacent Video Questions", "SEO + Binge Mapping", "CEO Validation"].map((stage, index) => <div className="agent-stage" key={stage}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong></div>)}
          </div>
        </div>
      </section>
    </main>
  );
}