import { useCallback, useEffect, useRef, useState } from "react";
import ImageUploader from "./components/ImageUploader";
import Controls from "./components/Controls";
import AsciiOutput from "./components/AsciiOutput";
import VideoControls from "./components/VideoControls";
import AudioControls from "./components/AudioControls";
import { charsetPorDefecto } from "./lib/charsets";
import { rowsDeFuente } from "./lib/convertir";
import { exportarGif, exportarWebM, exportarAudioWebM } from "./lib/videoExport";
import { visualizarAudio } from "./lib/audioViz";
import { descargarBlob } from "./lib/descargar";
import { useWebcam } from "./hooks/useWebcam";
import { useAudio } from "./hooks/useAudio";
import "./styles.css";

export default function App() {
  const [image, setImage] = useState(null);
  const [nombre, setNombre] = useState("");
  const [live, setLive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState(null);
  const [opts, setOpts] = useState({
    width: 100,
    charsetKey: charsetPorDefecto,
    invert: false,
    colorMode: false,
    brightness: 0,
    contrast: 0,
    gamma: 1,
    edges: false,
    edgeThreshold: 20,
    vizStyle: "spectrum",
  });

  // Estado del audio subido.
  const [audioUrl, setAudioUrl] = useState(null);

  // Estado del vídeo subido.
  const [videoUrl, setVideoUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);
  const [exportando, setExportando] = useState(null); // 'gif' | 'webm' | null
  const [progresoExp, setProgresoExp] = useState(0);

  const fileVideoRef = useRef(null);
  const exportandoRef = useRef(null);

  // Opciones más recientes, accesibles desde los bucles sin reiniciarlos.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const actualizar = (cambios) => setOpts((prev) => ({ ...prev, ...cambios }));

  // --- Modo imagen estática ---
  useEffect(() => {
    if (live || videoUrl || audioUrl || !image) return;
    setRows(rowsDeFuente(image, opts));
  }, [live, videoUrl, audioUrl, image, opts]);

  // --- Modo audio (visualizador) ---
  const onAudioFrame = useCallback((analyser) => {
    if (!analyser) return;
    setRows(visualizarAudio(analyser, optsRef.current));
  }, []);
  const audio = useAudio(audioUrl, onAudioFrame, (err) => {
    setErrorMsg("Error de audio: " + (err?.message || err));
  });

  // --- Modo webcam en vivo ---
  const onFrame = useCallback((video) => {
    setRows(rowsDeFuente(video, optsRef.current));
  }, []);
  const videoRef = useWebcam(live, onFrame, (err) => {
    setErrorMsg("No se pudo acceder a la cámara: " + (err?.message || err));
    setLive(false);
  });

  // --- Vídeo: metadatos / fin / búsquedas manuales ---
  useEffect(() => {
    const v = fileVideoRef.current;
    if (!videoUrl || !v) return;
    const onMeta = () => {
      setDur(v.duration);
      setCur(0);
      setRows(rowsDeFuente(v, optsRef.current));
    };
    const onEnded = () => setPlaying(false);
    const onSeeked = () => {
      if (exportandoRef.current) return; // durante exportación no refrescamos la vista
      setRows(rowsDeFuente(v, optsRef.current));
      setCur(v.currentTime);
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended", onEnded);
    v.addEventListener("seeked", onSeeked);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("seeked", onSeeked);
    };
  }, [videoUrl]);

  // --- Vídeo: bucle de reproducción (~16 fps) mientras está en play ---
  useEffect(() => {
    const v = fileVideoRef.current;
    if (!videoUrl || !v || !playing) return;
    let raf;
    let ultimo = 0;
    let cancel = false;
    const loop = (ts) => {
      if (cancel) return;
      if (ts - ultimo > 60) {
        ultimo = ts;
        setRows(rowsDeFuente(v, optsRef.current));
        setCur(v.currentTime);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancel = true;
      cancelAnimationFrame(raf);
    };
  }, [videoUrl, playing]);

  // --- Vídeo: re-render al cambiar opciones estando en pausa ---
  useEffect(() => {
    const v = fileVideoRef.current;
    if (!videoUrl || !v || playing || exportandoRef.current) return;
    if (v.readyState >= 2) setRows(rowsDeFuente(v, opts));
  }, [opts, videoUrl, playing]);

  const limpiarVideo = () => {
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPlaying(false);
    setDur(0);
    setCur(0);
  };

  const limpiarAudio = () => {
    if (audio.playing) audio.toggle();
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const usarImagen = (img, name) => {
    setLive(false);
    limpiarVideo();
    limpiarAudio();
    setErrorMsg("");
    setImage(img);
    setNombre(name);
  };

  const usarVideo = (file) => {
    setLive(false);
    setImage(null);
    limpiarAudio();
    setErrorMsg("");
    setNombre(file.name);
    setPlaying(false);
    setCur(0);
    setDur(0);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const usarAudio = (file) => {
    setLive(false);
    setImage(null);
    limpiarVideo();
    setErrorMsg("");
    setNombre(file.name);
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const alternarWebcam = () => {
    setErrorMsg("");
    if (live) {
      setLive(false); // congela el último fotograma
    } else {
      setImage(null);
      limpiarVideo();
      limpiarAudio();
      setNombre("");
      setLive(true);
    }
  };

  const togglePlay = () => {
    const v = fileVideoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      v.play();
      setPlaying(true);
    }
  };

  const onSeek = (t) => {
    const v = fileVideoRef.current;
    if (v) v.currentTime = t;
    setCur(t);
  };

  const exportar = async (formato) => {
    const v = fileVideoRef.current;
    if (!v) return;
    v.pause();
    setPlaying(false);
    exportandoRef.current = formato;
    setExportando(formato);
    setProgresoExp(0);
    try {
      const o = optsRef.current;
      const blob =
        formato === "gif"
          ? await exportarGif(v, o, setProgresoExp)
          : await exportarWebM(v, o, setProgresoExp);
      descargarBlob(blob, `ascii.${formato}`);
    } catch (e) {
      setErrorMsg("Error al exportar: " + (e?.message || e));
    } finally {
      exportandoRef.current = null;
      setExportando(null);
      setProgresoExp(0);
    }
  };

  const exportarAudio = async () => {
    if (audio.playing) audio.toggle();
    exportandoRef.current = "webm";
    setExportando("webm");
    setProgresoExp(0);
    try {
      await audio.prepararGrafo();
      const blob = await exportarAudioWebM(
        audio.audioRef.current,
        audio.analyserRef.current,
        audio.streamDestRef.current,
        optsRef.current,
        setProgresoExp
      );
      descargarBlob(blob, "ascii-audio.webm");
    } catch (e) {
      setErrorMsg("Error al exportar: " + (e?.message || e));
    } finally {
      exportandoRef.current = null;
      setExportando(null);
      setProgresoExp(0);
    }
  };

  return (
    <main className="app">
      <header>
        <h1>Conversor de Imágenes a ASCII</h1>
        {nombre && <p className="archivo">{nombre}</p>}
      </header>

      <div className="fuente">
        <ImageUploader onImage={usarImagen} onVideo={usarVideo} onAudio={usarAudio} />
        <button
          type="button"
          className={`webcam-btn ${live ? "webcam-btn--activo" : ""}`}
          onClick={alternarWebcam}
        >
          {live ? "■ Detener webcam" : "● Usar webcam"}
        </button>
      </div>

      {errorMsg && <p className="error">{errorMsg}</p>}

      <Controls
        {...opts}
        onChange={actualizar}
        disabled={!image && !live && !videoUrl && !audioUrl}
      />

      {videoUrl && (
        <VideoControls
          playing={playing}
          onTogglePlay={togglePlay}
          current={cur}
          duration={dur}
          onSeek={onSeek}
          onExport={exportar}
          exportando={exportando}
          progreso={progresoExp}
        />
      )}

      {audioUrl && (
        <AudioControls
          playing={audio.playing}
          onTogglePlay={audio.toggle}
          current={audio.current}
          duration={audio.duration}
          onSeek={audio.seek}
          vizStyle={opts.vizStyle}
          onStyleChange={(vizStyle) => actualizar({ vizStyle })}
          onExport={exportarAudio}
          exportando={exportando}
          progreso={progresoExp}
        />
      )}

      <AsciiOutput rows={rows} colorMode={opts.colorMode} />

      {/* Medios ocultos: webcam, vídeo subido y audio subido. */}
      <video ref={videoRef} playsInline muted style={{ display: "none" }} />
      <video
        ref={fileVideoRef}
        src={videoUrl ?? undefined}
        playsInline
        muted
        style={{ display: "none" }}
      />
      <audio ref={audio.audioRef} src={audioUrl ?? undefined} />
    </main>
  );
}
