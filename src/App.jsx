import { useCallback, useEffect, useRef, useState } from "react";
import ImageUploader from "./components/ImageUploader";
import Controls from "./components/Controls";
import AsciiOutput from "./components/AsciiOutput";
import VideoControls from "./components/VideoControls";
import AudioControls from "./components/AudioControls";
import { asciiToText, asciiToCanvas } from "./lib/asciiConverter";
import { charsetPorDefecto } from "./lib/charsets";
import { rowsDeFuente } from "./lib/convertir";
import { exportarGif, exportarWebM, exportarAudioWebM } from "./lib/videoExport";
import { visualizarAudio } from "./lib/audioViz";
import { descargarBlob } from "./lib/descargar";
import { translations, LangContext } from "./lib/i18n";
import { leerIdioma, guardarIdioma } from "./lib/prefs";
import { useWebcam } from "./hooks/useWebcam";
import { useAudio } from "./hooks/useAudio";
import "./styles.css";

export default function App() {
  const [lang, setLang] = useState(() => leerIdioma() || "es");
  const t = translations[lang];
  const cambiarIdioma = (l) => {
    setLang(l);
    guardarIdioma(l);
  };
  const [image, setImage] = useState(null);
  const [nombre, setNombre] = useState("");
  const [live, setLive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [opts, setOpts] = useState({
    width: 120,
    charsetKey: charsetPorDefecto,
    invert: true,
    colorMode: false,
    brightness: 0,
    contrast: 0,
    gamma: 1,
    edges: false,
    edgeThreshold: 20,
    vizStyle: "bar",
    palette: "clasico",
    gain: 1.5,
  });

  const [audioUrl, setAudioUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);
  const [exportando, setExportando] = useState(null);
  const [progresoExp, setProgresoExp] = useState(0);

  const fileVideoRef = useRef(null);
  const exportandoRef = useRef(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const actualizar = (cambios) => setOpts((prev) => ({ ...prev, ...cambios }));

  // --- Modo imagen estática ---
  useEffect(() => {
    if (live || videoUrl || audioUrl || !image) return;
    setRows(rowsDeFuente(image, opts));
  }, [live, videoUrl, audioUrl, image, opts]);

  // --- Webcam ---
  const onFrame = useCallback((video) => {
    setRows(rowsDeFuente(video, optsRef.current));
  }, []);
  const videoRef = useWebcam(live, onFrame, (err) => {
    setErrorMsg(t.camError + (err?.message || err));
    setLive(false);
  });

  // --- Audio (visualizador) ---
  const onAudioFrame = useCallback((analyser) => {
    if (!analyser) return;
    setRows(visualizarAudio(analyser, optsRef.current));
  }, []);
  const audio = useAudio(audioUrl, onAudioFrame, (err) =>
    setErrorMsg(t.audioError + (err?.message || err))
  );

  // --- Vídeo: metadatos / fin / búsquedas ---
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
      if (exportandoRef.current) return;
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

  // --- Vídeo: bucle de reproducción ---
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

  // --- Vídeo: re-render al cambiar opciones en pausa ---
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
      setLive(false);
    } else {
      setImage(null);
      limpiarVideo();
      limpiarAudio();
      setNombre("");
      setLive(true);
    }
  };

  // --- Transporte de vídeo ---
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

  // --- Exportaciones ---
  const exportarVideo = async (formato) => {
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
      setErrorMsg(t.exportError + (e?.message || e));
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
      setErrorMsg(t.exportError + (e?.message || e));
    } finally {
      exportandoRef.current = null;
      setExportando(null);
      setProgresoExp(0);
    }
  };

  // --- Acciones de salida ---
  const texto = rows ? asciiToText(rows) : "";
  const copiar = async () => {
    if (!rows) return;
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1400);
  };
  const dlTxt = () => {
    if (!rows) return;
    descargarBlob(new Blob([texto], { type: "text/plain;charset=utf-8" }), "ascii-art.txt");
  };
  const dlPng = () => {
    if (!rows) return;
    asciiToCanvas(rows, { colorMode: opts.colorMode }).toBlob((b) => {
      if (b) descargarBlob(b, "ascii-art.png");
    }, "image/png");
  };

  const hayFuente = !!image || live || !!videoUrl || !!audioUrl;
  const enVivo = live || playing || audio.playing;
  const dims = rows ? `${rows[0].length}×${rows.length}` : "";
  const estado = enVivo ? t.live : rows ? t.ready : t.idle;

  return (
    <LangContext.Provider value={t}>
    <div className="workstation">
      <div className="panel">
        <div className="panel__screw panel__screw--tl" />
        <div className="panel__screw panel__screw--tr" />
        <div className="panel__screw panel__screw--bl" />
        <div className="panel__screw panel__screw--br" />

        <div className="brandbar">
          <div className="brandbar__left">
            <div className="brandbar__led" />
            <span className="brandbar__title">ASCII&#8209;TEXTRONIX</span>
            <span className="brandbar__badge">MODEL&nbsp;B&#8209;84</span>
          </div>
          <div className="brandbar__right">
            <span className="brandbar__dims">{nombre || dims}</span>
            <div className="langtoggle">
              <button
                className={`langtoggle__btn ${lang === "en" ? "langtoggle__btn--on" : ""}`}
                onClick={() => cambiarIdioma("en")}
              >
                EN
              </button>
              <button
                className={`langtoggle__btn ${lang === "es" ? "langtoggle__btn--on" : ""}`}
                onClick={() => cambiarIdioma("es")}
              >
                ES
              </button>
            </div>
          </div>
        </div>

        <div className="deck">
          <div className="screen-col">
            <div className="bezel">
              <div className="crt">
                <div className="crt__top">
                  <span className="crt__label">{t.output}</span>
                  <span className="crt__cursor" />
                  <span className="crt__status">{estado}</span>
                </div>
                <div className="crt__view">
                  {rows ? (
                    <AsciiOutput rows={rows} colorMode={opts.colorMode} />
                  ) : (
                    <div className="crt__awaiting">
                      {t.awaiting}
                      <br />
                      <span>{t.awaitingSub}</span>
                    </div>
                  )}
                </div>
                <div className="crt__scanlines" />
                <div className="crt__vignette" />
              </div>
            </div>

            <ImageUploader onImage={usarImagen} onVideo={usarVideo} onAudio={usarAudio} />

            <div className="actions">
              <button
                className={`btn ${live ? "btn--danger" : ""}`}
                onClick={alternarWebcam}
              >
                {live ? t.webcamStop : t.webcam}
              </button>
              <button className="btn" onClick={copiar} disabled={!rows}>
                {copiado ? t.copied : t.copy}
              </button>
              <button className="btn" onClick={dlTxt} disabled={!rows}>
                {t.saveTxt}
              </button>
              <button className="btn" onClick={dlPng} disabled={!rows}>
                {t.savePng}
              </button>
            </div>

            {errorMsg && <p className="error">{errorMsg}</p>}

            {videoUrl && (
              <VideoControls
                playing={playing}
                onTogglePlay={togglePlay}
                current={cur}
                duration={dur}
                onSeek={onSeek}
                onExport={exportarVideo}
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
                palette={opts.palette}
                onPaletteChange={(palette) => actualizar({ palette })}
                gain={opts.gain}
                onGainChange={(gain) => actualizar({ gain })}
                onExport={exportarAudio}
                exportando={exportando}
                progreso={progresoExp}
              />
            )}
          </div>

          <div className="control-deck">
            <div className="control-deck__title">{t.controlPanel}</div>
            <Controls {...opts} onChange={actualizar} disabled={!hayFuente} />
          </div>
        </div>
      </div>

      {/* Medios ocultos */}
      <video ref={videoRef} playsInline muted style={{ display: "none" }} />
      <video
        ref={fileVideoRef}
        src={videoUrl ?? undefined}
        playsInline
        muted
        style={{ display: "none" }}
      />
      <audio ref={audio.audioRef} src={audioUrl ?? undefined} />
    </div>
    </LangContext.Provider>
  );
}
