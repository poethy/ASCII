import { useEffect, useRef, useState } from "react";

/**
 * Gestiona la reproducción de un archivo de audio y su análisis en tiempo real.
 * Construye el grafo Web Audio (source -> analyser -> destino, y una salida de
 * stream para grabar el audio al exportar) y, mientras reproduce, llama a
 * `onFrame(analyser)` en cada fotograma.
 *
 * @param {string|null} url - object URL del audio.
 * @param {(analyser: AnalyserNode|null) => void} onFrame
 * @param {(error: unknown) => void} [onError]
 */
export function useAudio(url, onFrame, onError) {
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamDestRef = useRef(null);
  const onFrameRef = useRef(onFrame);
  const onErrorRef = useRef(onError);
  onFrameRef.current = onFrame;
  onErrorRef.current = onError;

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  // El grafo se crea una sola vez (createMediaElementSource no se puede repetir
  // sobre el mismo elemento). Cambiar de archivo solo cambia el `src`.
  const asegurarGrafo = () => {
    if (ctxRef.current || !audioRef.current) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const source = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    const streamDest = ctx.createMediaStreamDestination();
    source.connect(analyser);
    analyser.connect(ctx.destination); // para oírlo
    source.connect(streamDest); // pista de audio para la exportación
    ctxRef.current = ctx;
    analyserRef.current = analyser;
    streamDestRef.current = streamDest;
  };

  const prepararGrafo = async () => {
    asegurarGrafo();
    if (ctxRef.current?.state === "suspended") await ctxRef.current.resume();
  };

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    try {
      asegurarGrafo();
      // Reanudar el contexto es "best-effort": no bloqueamos la reproducción
      // esperándolo (en algunos entornos el await puede quedar pendiente).
      ctxRef.current?.resume?.();
      await a.play();
      setPlaying(true);
    } catch (e) {
      onErrorRef.current?.(e);
    }
  };

  const seek = (t) => {
    const a = audioRef.current;
    if (a) a.currentTime = t;
    setCurrent(t);
  };

  // Eventos del elemento <audio>.
  useEffect(() => {
    const a = audioRef.current;
    if (!url || !a) return;
    const onMeta = () => {
      setDuration(a.duration || 0);
      setCurrent(0);
    };
    const onTime = () => setCurrent(a.currentTime);
    const onEnded = () => setPlaying(false);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
    };
  }, [url]);

  // Bucle de animación mientras reproduce, limitado a ~30 fps para no saturar
  // con re-renders (suficiente para el visualizador).
  useEffect(() => {
    if (!playing) return;
    let raf;
    let cancel = false;
    let ultimo = 0;
    const loop = (ts) => {
      if (cancel) return;
      if (ts - ultimo >= 33) {
        ultimo = ts;
        onFrameRef.current?.(analyserRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancel = true;
      cancelAnimationFrame(raf);
    };
  }, [playing]);

  return {
    audioRef,
    playing,
    current,
    duration,
    toggle,
    seek,
    setPlaying,
    prepararGrafo,
    analyserRef,
    streamDestRef,
  };
}
