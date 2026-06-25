"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

const ACCESS_CODE = "0070";
const scanMessages = [
  "analizando identidad",
  "comparando biometria",
  "verificando autorizacion",
  "sincronizando archivo clasificado",
];
const SOUND_VOLUME = 0.55;

export default function Home() {
  const [phase, setPhase] = useState<
    "login" | "scan" | "recognized" | "mission" | "agent-profile"
  >("login");
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [missionAccepted, setMissionAccepted] = useState(false);
  const [missionCountdown, setMissionCountdown] = useState(10);
  const [fileDestroyed, setFileDestroyed] = useState(false);
  const [isAgentImageOpen, setIsAgentImageOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const keySoundRef = useRef<HTMLAudioElement>(null);
  const errorSoundRef = useRef<HTMLAudioElement>(null);
  const grantedSoundRef = useRef<HTMLAudioElement>(null);
  const scanLoopRef = useRef<HTMLAudioElement>(null);
  const recognizedSoundRef = useRef<HTMLAudioElement>(null);

  const playSound = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) {
      return;
    }

    audio.volume = SOUND_VOLUME;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, []);

  const stopScanLoop = useCallback(() => {
    const audio = scanLoopRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
  }, []);

  useEffect(() => {
    if (phase !== "scan") {
      return;
    }

    let stream: MediaStream | null = null;
    let mounted = true;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (!mounted || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        setCameraReady(true);
      } catch {
        setCameraError(
          "Camara no disponible. El reconocimiento seguira en modo simulacion local."
        );
      }
    };

    startCamera();

    const loop = scanLoopRef.current;
    if (loop) {
      loop.volume = SOUND_VOLUME;
      loop.currentTime = 0;
      void loop.play().catch(() => undefined);
    }

    const progressTimer = setInterval(() => {
      setScanProgress((current) => Math.min(current + 2, 100));
    }, 90);

    const unlockTimer = setTimeout(() => {
      setScanProgress(100);
      stopScanLoop();
      playSound(recognizedSoundRef.current);
      setPhase("recognized");
    }, 5200);

    return () => {
      mounted = false;
      if (progressTimer) {
        clearInterval(progressTimer);
      }
      if (unlockTimer) {
        clearTimeout(unlockTimer);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      stopScanLoop();
    };
  }, [phase, playSound, stopScanLoop]);

  useEffect(() => {
    if (!missionAccepted) {
      return;
    }

    const countdownTimer = window.setInterval(() => {
      setMissionCountdown((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(countdownTimer);
          setFileDestroyed(true);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdownTimer);
  }, [missionAccepted]);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (code.trim() === ACCESS_CODE) {
      playSound(grantedSoundRef.current);
      setLoginError("");
      setScanProgress(0);
      setCameraReady(false);
      setCameraError("");
      setPhase("scan");
      return;
    }

    playSound(errorSoundRef.current);
    setLoginError("Codigo denegado. Reintente con autorizacion valida.");
    setCode("");
  };

  return (
    <main className="classified-shell min-h-screen overflow-hidden bg-[#07090b] text-stone-100">
      <audio ref={keySoundRef} src="/sounds/key.wav" preload="auto" />
      <audio ref={errorSoundRef} src="/sounds/error.wav" preload="auto" />
      <audio ref={grantedSoundRef} src="/sounds/access-granted.wav" preload="auto" />
      <audio ref={scanLoopRef} src="/sounds/scan-loop.wav" preload="auto" loop />
      <audio ref={recognizedSoundRef} src="/sounds/recognized.wav" preload="auto" />

      <div className="scan-grid" />
      <div className="signal-noise" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-cyan-300/20 pb-4 font-mono text-[0.68rem] uppercase tracking-[0.28em] text-cyan-100/70">
          <span>Inteligencia Militar</span>
          <span className="hidden sm:inline">Sección 6</span>
        </header>

        {phase === "login" && (
          <div className="flex flex-1 items-center justify-center py-10">
            <form
              onSubmit={handleLogin}
              className="classified-panel w-full max-w-md space-y-7 p-6 sm:p-8"
            >
              <div className="space-y-3">
                <div className="flex justify-center pb-2">
                  <Image
                    src="/images/logo.png"
                    alt="Insignia de acceso clasificado"
                    width={180}
                    height={180}
                    className="h-24 w-auto object-contain drop-shadow-[0_0_24px_rgba(103,232,249,0.28)] sm:h-28"
                    priority
                  />
                </div>
                <p className="font-mono text-xs uppercase tracking-[0.45em] text-red-300">
                  sistema clasificado
                </p>
                <h1 className="text-3xl font-semibold tracking-[0.08em] text-white sm:text-4xl">
                  Acceso restringido
                </h1>
                <p className="text-sm leading-6 text-stone-300">
                  Terminal seguro para agentes autorizados
                </p>
              </div>

              <label className="block space-y-3">
                <span className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-100/70">
                  codigo de agente
                </span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key.length === 1 ||
                      event.key === "Backspace" ||
                      event.key === "Delete"
                    ) {
                      playSound(keySoundRef.current);
                    }
                  }}
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  className="h-14 w-full border border-cyan-200/30 bg-black/50 px-4 text-center font-mono text-2xl tracking-[0.7em] text-cyan-100 outline-none transition focus:border-cyan-200 focus:shadow-[0_0_24px_rgba(103,232,249,0.24)]"
                  aria-label="Codigo de acceso"
                />
              </label>

              {loginError && (
                <p className="border border-red-400/30 bg-red-950/30 px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-red-200">
                  {loginError}
                </p>
              )}

              <button className="h-12 w-full border border-cyan-200/50 bg-cyan-100 px-5 font-mono text-xs font-bold uppercase tracking-[0.24em] text-black transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-black">
                autenticar
              </button>
            </form>
          </div>
        )}

        {phase === "scan" && (
          <div className="grid flex-1 items-center gap-5 py-5 lg:grid-cols-[1.55fr_0.75fr]">
            <div className="classified-panel relative overflow-hidden p-3">
              <div className="camera-frame relative aspect-[4/5] max-h-[82vh] w-full overflow-hidden bg-black sm:aspect-video lg:max-h-[78vh]">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover opacity-85"
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_55%)] font-mono text-xs uppercase tracking-[0.28em] text-cyan-100/70">
                    esperando camara
                  </div>
                )}
                <div className="face-target" />
                <div className="scanner-line" />
                <div className="absolute inset-x-5 top-5 flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.24em] text-cyan-100">
                  <span>biometria activa</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="absolute bottom-5 left-5 right-5 h-2 border border-cyan-200/40 bg-black/60">
                  <div
                    className="h-full bg-cyan-200 transition-all duration-100"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <aside className="classified-panel space-y-6 p-6">
              <div className="flex items-center gap-4">
                <Image
                  src="/images/logo.png"
                  alt="Insignia de reconocimiento"
                  width={96}
                  height={96}
                  className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_0_18px_rgba(103,232,249,0.28)]"
                />
                <div>
                  {/* <p className="font-mono text-xs uppercase tracking-[0.4em] text-cyan-100/60">
                    reconocimiento facial
                  </p> */}
                  <h2 className="mt-1 text-2xl font-semibold tracking-[0.08em] text-white">
                    Escaneo de identidad
                  </h2>
                </div>
              </div>

              <div className="space-y-3">
                {scanMessages.map((message, index) => {
                  const active = scanProgress >= index * 24;
                  return (
                    <div
                      key={message}
                      className="flex items-center justify-between border border-cyan-200/15 bg-cyan-950/10 px-4 py-3 font-mono text-[0.68rem] uppercase tracking-[0.18em]"
                    >
                      <span className={active ? "text-cyan-100" : "text-stone-500"}>
                        {message}
                      </span>
                      <span className={active ? "text-emerald-300" : "text-stone-600"}>
                        {active ? "ok" : "..."}
                      </span>
                    </div>
                  );
                })}
              </div>

              {cameraError && (
                <p className="border border-amber-300/30 bg-amber-950/20 px-4 py-3 text-sm leading-6 text-amber-100">
                  {cameraError}
                </p>
              )}

            </aside>
          </div>
        )}

        {phase === "recognized" && (
          <div className="flex flex-1 items-center justify-center py-8">
            <section className="classified-panel relative flex min-h-[64vh] w-full max-w-4xl flex-col items-center justify-center overflow-hidden p-8 text-center sm:p-12">
              <div className="absolute h-72 w-72 rounded-full border border-emerald-200/20 animate-ping" />
              <div className="absolute h-96 w-96 rounded-full border border-cyan-200/10" />
              <Image
                src="/images/logo.png"
                alt="Insignia de autorizacion"
                width={150}
                height={150}
                className="relative h-24 w-24 object-contain drop-shadow-[0_0_28px_rgba(103,232,249,0.34)] sm:h-32 sm:w-32"
              />
              <p className="relative mt-8 font-mono text-xs uppercase tracking-[0.45em] text-emerald-200 sm:text-sm">
                reconocimiento completado
              </p>
              <h1 className="relative mt-5 text-4xl font-black uppercase tracking-[0.12em] text-white drop-shadow-[0_0_30px_rgba(16,185,129,0.45)] sm:text-6xl lg:text-7xl">
                AGENTE 0070 RECONOCIDO
              </h1>
              <p className="relative mt-6 font-mono text-lg font-bold uppercase tracking-[0.22em] text-cyan-100 sm:text-2xl">
                NIVEL DE AUTORIZACION: 5
              </p>
              <p className="relative mt-3 font-mono text-sm uppercase tracking-[0.24em] text-emerald-100 sm:text-base">
                MISION DESBLOQUEADA
              </p>
              <button
                onClick={() => setPhase("mission")}
                className="relative mt-10 h-12 w-full max-w-md border border-emerald-200/60 bg-emerald-200 px-4 font-mono text-xs font-bold uppercase tracking-[0.22em] text-black transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-black"
              >
                abrir expediente
              </button>
            </section>
          </div>
        )}

        {phase === "agent-profile" && (
          <div className="flex flex-1 items-center justify-center py-8">
            <section className="classified-panel w-full max-w-4xl space-y-6 p-6 sm:p-8">
              <div className="flex flex-col gap-4 border-b border-cyan-300/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.4em] text-red-200">
                    expediente individual recuperado
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[0.08em] text-white sm:text-5xl">
                    AGENTE 069
                  </h1>
                  <p className="mt-3 font-mono text-sm uppercase tracking-[0.28em] text-cyan-100/75">
                    estado: baja confirmada
                  </p>
                </div>
                <button
                  onClick={() => setPhase("mission")}
                  className="h-11 border border-cyan-200/50 px-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-100 hover:text-black focus:outline-none focus:ring-2 focus:ring-cyan-200"
                >
                  volver a la mision
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-[minmax(190px,0.7fr)_1fr] sm:items-start">
                <button
                  type="button"
                  onClick={() => setIsAgentImageOpen(true)}
                  className="group overflow-hidden border border-red-300/30 bg-black/50 text-left transition hover:border-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                  aria-label="Ver imagen completa del Agente 069"
                >
                  <Image
                    src="/images/069.png"
                    alt="Retrato del Agente 069"
                    width={480}
                    height={640}
                    className="aspect-[3/4] w-full object-cover grayscale"
                    priority
                  />
                  <p className="border-t border-red-300/20 bg-red-950/20 px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-red-100 transition group-hover:bg-cyan-100 group-hover:text-black">
                    archivo visual: ver imagen completa
                  </p>
                </button>

                <div className="space-y-4">
                  <p className="border border-cyan-200/20 bg-black/45 p-5 text-base leading-7 text-stone-200">
                    Agente de campo abatido durante una misión encubierta. La
                    evidencia apunta a un envenenamiento con champagne ejecutado
                    por la asesina a sueldo conocida como La Viuda Negra.
                  </p>
                  <dl className="grid overflow-hidden border border-cyan-200/20 font-mono text-xs uppercase tracking-[0.14em] sm:grid-cols-2">
                    <div className="border-b border-cyan-200/15 p-4 sm:border-r">
                      <dt className="text-cyan-100/55">nivel de autorizacion</dt>
                      <dd className="mt-2 text-base text-cyan-100">4</dd>
                    </div>
                    <div className="border-b border-cyan-200/15 p-4">
                      <dt className="text-cyan-100/55">especialidad</dt>
                      <dd className="mt-2 text-base text-cyan-100">infiltracion</dd>
                    </div>
                    <div className="border-b border-cyan-200/15 p-4 sm:border-b-0 sm:border-r">
                      <dt className="text-cyan-100/55">ultima operacion</dt>
                      <dd className="mt-2 text-base text-cyan-100">viuda negra</dd>
                    </div>
                    <div className="p-4">
                      <dt className="text-cyan-100/55">causa registrada</dt>
                      <dd className="mt-2 text-base text-red-200">envenenamiento</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {isAgentImageOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-8"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Imagen completa del Agente 069"
                  onClick={() => setIsAgentImageOpen(false)}
                >
                  <div
                    className="relative max-h-full max-w-5xl border border-cyan-200/40 bg-black p-2 shadow-[0_0_45px_rgba(103,232,249,0.2)]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setIsAgentImageOpen(false)}
                      className="absolute right-4 top-4 z-10 border border-cyan-100/60 bg-black/80 px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-100 hover:text-black focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    >
                      cerrar
                    </button>
                    <Image
                      src="/images/069.png"
                      alt="Imagen completa del Agente 069"
                      width={1448}
                      height={1086}
                      className="max-h-[85vh] w-auto max-w-full object-contain"
                      priority
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {phase === "mission" && (
          <div className="flex flex-1 items-center justify-center py-8">
            {fileDestroyed ? (
              <section className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-black p-8 text-center">
                <p className="font-mono text-xs uppercase tracking-[0.45em] text-red-300 sm:text-sm">
                  protocolo de autodestruccion completado
                </p>
                <h1 className="mt-6 font-mono text-3xl font-black uppercase tracking-[0.18em] text-red-100 drop-shadow-[0_0_24px_rgba(248,113,113,0.65)] sm:text-5xl">
                  archivo destruido
                </h1>
              </section>
            ) : missionAccepted ? (
              <section className="classified-panel relative flex min-h-[62vh] w-full max-w-4xl flex-col items-center justify-center overflow-hidden p-8 text-center sm:p-12">
                <div className="absolute h-72 w-72 rounded-full border border-emerald-200/25 animate-ping" />
                <div className="absolute h-96 w-96 rounded-full border border-cyan-200/10" />
                <p className="relative font-mono text-xs uppercase tracking-[0.45em] text-emerald-200 sm:text-sm">
                  confirmacion de comando central
                </p>
                <h1 className="relative mt-6 text-4xl font-black uppercase tracking-[0.12em] text-white drop-shadow-[0_0_30px_rgba(16,185,129,0.45)] sm:text-6xl lg:text-7xl">
                  OPERACION AUTORIZADA
                </h1>
                <p className="relative mt-7 font-mono text-lg font-bold uppercase tracking-[0.22em] text-cyan-100 sm:text-2xl">
                  ANTÍDOTO EN CAMINO
                </p>
                <div className="relative mt-10 w-full max-w-md space-y-4">
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-100/80">
                    autodestruccion del archivo en {missionCountdown} segundos
                  </p>
                  <div className="h-2 overflow-hidden border border-emerald-200/40 bg-black/60">
                    <div
                      className="h-full bg-emerald-200 transition-[width] duration-1000 ease-linear"
                      style={{ width: `${(missionCountdown / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </section>
            ) : (
            <section className="classified-panel w-full max-w-4xl space-y-6 p-6 sm:p-8">
              <div className="flex flex-col gap-4 border-b border-cyan-300/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.4em] text-emerald-200">
                    expediente desbloqueado
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[0.08em] text-white sm:text-5xl">
                    EXPEDIENTE CLASIFICADO
                  </h1>
                  <h2 className="mt-3 font-mono text-sm uppercase tracking-[0.28em] text-cyan-100/75">
                    MISIÓN PARA EL AGENTE 0070
                  </h2>
                </div>                
              </div>

              <article className="border border-cyan-200/20 bg-black/45 p-5 text-base leading-8 text-stone-100 shadow-[inset_0_0_35px_rgba(103,232,249,0.05)] sm:p-7 sm:text-lg">
                <div className="mb-6 grid gap-5 border border-red-300/20 bg-red-950/10 p-4 sm:grid-cols-[180px_1fr] sm:items-center">
                  <button
                    type="button"
                    onClick={() => setPhase("agent-profile")}
                    className="group relative mx-auto block w-full max-w-44 overflow-hidden border border-cyan-200/25 bg-black/50 text-left transition hover:border-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    aria-label="Abrir perfil del Agente 069"
                  >
                    <Image
                      src="/images/069.png"
                      alt="Archivo fotografico del Agente 069"
                      width={360}
                      height={480}
                      className="aspect-[3/4] w-full object-cover grayscale"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/75 px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-red-200 transition group-hover:bg-cyan-100 group-hover:text-black">
                      agente 069 · ver perfil
                    </div>
                  </button>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.32em] text-red-200">
                      baja confirmada
                    </p>
                    <p className="mt-3 text-sm leading-6 text-stone-300 sm:text-base">
                      Registro visual recuperado del expediente del agente 069.
                    </p>
                  </div>
                </div>

                <p>
                  El Agente 069 fue abatido durante una misión.
                  La responsable ha sido identificada como una enemiga de
                  prioridad crítica, conocida en los archivos de la agencia
                  como &quot;La Viuda Negra&quot;.
                </p>
                <p className="mt-5">
                  Según las pericias, el Agente 069 fue envenenado mediante una
                  copa de champagne, en una ejecución silenciosa, precisa y
                  cuidadosamente encubierta. El método confirma la intervención
                  de una operadora experta, con acceso a círculos cerrados y
                  capacidad para desaparecer antes de dejar rastro.
                </p>
                <p className="mt-5">
                  Agente, usted ha sido seleccionado para continuar la
                  operación. Su misión consiste en localizar y abatir a la Viuda
                  Negra, neutralizando la amenaza antes de que vuelva a actuar.
                </p>
                <p className="mt-5">
                  Si acepta la misión, la agencia le enviará un antídoto para
                  protegerlo del mismo veneno, en caso de que se le presente el mismo escenario.
                  A partir de este momento, toda comunicación queda
                  clasificada bajo nivel máximo de autorización.
                </p>
              </article>

              <button
                onClick={() => {
                  setMissionCountdown(10);
                  setFileDestroyed(false);
                  setMissionAccepted(true);
                }}
                className="h-12 w-full border border-emerald-200/60 bg-emerald-200 px-4 font-mono text-xs font-bold uppercase tracking-[0.22em] text-black transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-black"
              >
                ACEPTO LA MISION
              </button>
            </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
