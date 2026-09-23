"use client";

import { HeliosModel } from "@reactor-models/helios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { routeVideoIntent, type VideoIntent } from "@/lib/video-router";

type StudioStatus =
  | "idle"
  | "connecting"
  | "generating"
  | "paused"
  | "complete"
  | "error";

type Quality = "economy" | "balanced" | "premium";

const STATUS_LABEL: Record<StudioStatus, string> = {
  idle: "Pronto",
  connecting: "Conectando",
  generating: "Gerando",
  paused: "Pausado",
  complete: "Concluído",
  error: "Erro",
};

function preferredRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function qualityToSrScale(quality: Quality): "off" | "2x" | "4x" {
  if (quality === "economy") return "off";
  if (quality === "premium") return "4x";
  return "2x";
}

export function HeliosStudio() {
  const [prompt, setPrompt] = useState(
    "A cinematic medieval castle in heavy rain at night, warm lanterns, realistic atmospheric motion, slow camera push-in",
  );
  const [steerPrompt, setSteerPrompt] = useState("");
  const [duration, setDuration] = useState(12);
  const [quality, setQuality] = useState<Quality>("balanced");
  const [intent, setIntent] = useState<VideoIntent>("ambient");
  const [status, setStatus] = useState<StudioStatus>("idle");
  const [chunks, setChunks] = useState(0);
  const [error, setError] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingName, setRecordingName] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modelRef = useRef<HeliosModel | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const shouldRecordRef = useRef(false);
  const stopTimerRef = useRef<number | null>(null);
  const recordingUrlRef = useRef("");

  const route = useMemo(() => routeVideoIntent(intent), [intent]);

  const revokeRecordingUrl = useCallback(() => {
    if (recordingUrlRef.current) {
      URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = "";
    }
    setRecordingUrl("");
    setRecordingName("");
  }, []);

  const stopRecorder = useCallback(() => {
    shouldRecordRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const startRecorder = useCallback(
    (stream: MediaStream) => {
      if (!shouldRecordRef.current || recorderRef.current) return;

      if (typeof MediaRecorder === "undefined") {
        setError("Este navegador não suporta gravação de MediaStream.");
        return;
      }

      const mimeType = preferredRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recorderChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(recorderChunksRef.current, { type: finalType });
        recorderChunksRef.current = [];
        recorderRef.current = null;

        if (!blob.size) {
          setError("A geração terminou, mas o navegador não capturou frames suficientes.");
          setStatus("error");
          return;
        }

        revokeRecordingUrl();
        const url = URL.createObjectURL(blob);
        recordingUrlRef.current = url;
        const extension = finalType.includes("mp4") ? "mp4" : "webm";
        setRecordingUrl(url);
        setRecordingName(`vyramo-helios-${Date.now()}.${extension}`);
        setStatus("complete");
      };

      recorder.start(500);
      recorderRef.current = recorder;
    },
    [revokeRecordingUrl],
  );

  const stopGeneration = useCallback(async () => {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    const model = modelRef.current;
    if (model) {
      try {
        await model.pause();
      } catch {
        // The stream may already be paused/closed. Recording still needs finalization.
      }
    }

    stopRecorder();
  }, [stopRecorder]);

  const generate = useCallback(async () => {
    if (!route.readyInV1) {
      setError(
        `${route.provider} já está roteado, mas o adapter ainda não foi ativado nesta primeira fatia. Use Ambient, Vídeo longo ou Cinemático para o Helios.`,
      );
      setStatus("error");
      return;
    }

    if (!prompt.trim()) {
      setError("Digite uma descrição para o vídeo.");
      setStatus("error");
      return;
    }

    if (status === "generating" || status === "connecting") return;

    setError("");
    setChunks(0);
    revokeRecordingUrl();
    setStatus("connecting");
    shouldRecordRef.current = true;

    try {
      const tokenResponse = await fetch("/api/reactor/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const tokenPayload = (await tokenResponse.json()) as {
        jwt?: string;
        message?: string;
        error?: string;
      };

      if (!tokenResponse.ok || !tokenPayload.jwt) {
        throw new Error(
          tokenPayload.message ||
            tokenPayload.error ||
            "Não foi possível obter a sessão do Reactor.",
        );
      }

      const helios = new HeliosModel();
      modelRef.current = helios;

      helios.onMainVideo((_track, stream) => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          void video.play().catch(() => undefined);
        }
        startRecorder(stream);
      });

      helios.onChunkComplete((message) => {
        const chunkIndex =
          typeof message.chunk_index === "number" ? message.chunk_index + 1 : 0;
        setChunks((current) => Math.max(current + 1, chunkIndex));
      });

      helios.onGenerationStarted(() => {
        setStatus("generating");
      });

      helios.onGenerationPaused(() => {
        if (recorderRef.current?.state === "inactive") {
          setStatus("paused");
        }
      });

      helios.onCommandError((message) => {
        const reason =
          typeof message.reason === "string"
            ? message.reason
            : "O Reactor rejeitou um comando.";
        setError(reason);
      });

      await helios.connect(tokenPayload.jwt);
      await helios.setSeed({ seed: -1 });
      await helios.setSrScale({ sr_scale: qualityToSrScale(quality) });
      await helios.setPrompt({ prompt: prompt.trim() });
      await helios.start();

      stopTimerRef.current = window.setTimeout(() => {
        void stopGeneration();
      }, Math.max(4, duration) * 1000);
    } catch (caught) {
      shouldRecordRef.current = false;
      stopRecorder();
      setError(caught instanceof Error ? caught.message : "Falha inesperada.");
      setStatus("error");
    }
  }, [
    duration,
    prompt,
    quality,
    revokeRecordingUrl,
    route.provider,
    route.readyInV1,
    startRecorder,
    status,
    stopGeneration,
    stopRecorder,
  ]);

  const steer = useCallback(async () => {
    const nextPrompt = steerPrompt.trim();
    if (!nextPrompt || !modelRef.current) return;

    try {
      await modelRef.current.setPrompt({ prompt: nextPrompt });
      setPrompt(nextPrompt);
      setSteerPrompt("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao alterar a cena.");
    }
  }, [steerPrompt]);

  const resume = useCallback(async () => {
    if (!modelRef.current) return;
    try {
      shouldRecordRef.current = true;
      await modelRef.current.resume();
      setStatus("generating");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao retomar.");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      stopRecorder();
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
      const model = modelRef.current as (HeliosModel & {
        disconnect?: () => Promise<void> | void;
      }) | null;
      void model?.disconnect?.();
    };
  }, [stopRecorder]);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">VYRAMO AI</div>
          <div className="tagline">Find. Remodel. Sell. · Video Engine V1</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a className="top-link" href="/diamond">DIAMOND AGENT</a>
          <a className="top-link" href="/gold">GOLD TOPICS</a>
          <div className={`status status-${status}`}>
            <span className="status-dot" />
            {STATUS_LABEL[status]}
          </div>
        </div>
      </header>

      <section className="hero-grid">
        <div className="panel controls">
          <div className="eyebrow">AI DIRECTOR</div>
          <h1>Do prompt ao vídeo gerado.</h1>
          <p className="muted">
            O V1 usa Reactor Helios como primeiro provider real. O roteador já
            separa os próximos adapters sem prender o produto a um único modelo.
          </p>

          <label className="field">
            <span>Tipo de produção</span>
            <select value={intent} onChange={(e) => setIntent(e.target.value as VideoIntent)}>
              <option value="ambient">Ambient / faceless</option>
              <option value="long_video">Vídeo longo</option>
              <option value="cinematic">Cinemático</option>
              <option value="ugc">UGC de produto</option>
              <option value="avatar">Avatar / talking head</option>
              <option value="remodel">Remodelar vídeo</option>
            </select>
          </label>

          <div className="router-card">
            <div>
              <strong>{route.provider}</strong>
              <span>{route.model}</span>
            </div>
            <span className={route.readyInV1 ? "ready-chip" : "queued-chip"}>
              {route.readyInV1 ? "ATIVO" : "PRÓXIMO ADAPTER"}
            </span>
          </div>

          <label className="field">
            <span>Prompt</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              placeholder="Descreva cena, câmera, iluminação, movimento e atmosfera."
            />
          </label>

          <div className="two-col">
            <label className="field">
              <span>Duração da prova</span>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value={8}>8 segundos</option>
                <option value={12}>12 segundos</option>
                <option value={20}>20 segundos</option>
                <option value={30}>30 segundos</option>
              </select>
            </label>

            <label className="field">
              <span>Qualidade</span>
              <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
                <option value="economy">Economy · SR off</option>
                <option value="balanced">Balanced · 2×</option>
                <option value="premium">Premium · 4×</option>
              </select>
            </label>
          </div>

          <button
            className="primary"
            onClick={() => void generate()}
            disabled={status === "connecting" || status === "generating"}
          >
            {status === "connecting" ? "CONECTANDO..." : status === "generating" ? "GERANDO..." : "GERAR VÍDEO"}
          </button>

          {status === "generating" && (
            <button className="secondary" onClick={() => void stopGeneration()}>
              PARAR E FINALIZAR
            </button>
          )}

          {status === "paused" && (
            <button className="secondary" onClick={() => void resume()}>
              RETOMAR
            </button>
          )}

          {error && <div className="error-box">{error}</div>}
        </div>

        <div className="panel preview-panel">
          <div className="preview-header">
            <div>
              <div className="eyebrow">LIVE GENERATION</div>
              <strong>Helios stream</strong>
            </div>
            <div className="metrics">
              <span>Chunks {chunks}</span>
              <span>24 fps</span>
            </div>
          </div>

          <div className="video-stage">
            <video ref={videoRef} autoPlay playsInline muted />
            {status === "idle" && <div className="video-placeholder">A prévia aparecerá aqui.</div>}
            {status === "connecting" && <div className="video-placeholder">Abrindo sessão segura…</div>}
          </div>

          <div className="steer-row">
            <input
              value={steerPrompt}
              onChange={(e) => setSteerPrompt(e.target.value)}
              placeholder="Direcione a próxima cena sem reiniciar o vídeo..."
              disabled={status !== "generating"}
            />
            <button onClick={() => void steer()} disabled={status !== "generating" || !steerPrompt.trim()}>
              STEER
            </button>
          </div>

          {recordingUrl && (
            <div className="result-card">
              <div>
                <span className="result-label">CAPTURA FINAL</span>
                <strong>{recordingName}</strong>
              </div>
              <a href={recordingUrl} download={recordingName} className="download">
                BAIXAR
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="pipeline-strip">
        {["Prompt", "Secure token", "Helios", "Live stream", "Capture", "Render bridge"].map(
          (step, index) => (
            <div className="pipeline-step" key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </div>
          ),
        )}
      </section>
    </main>
  );
}
