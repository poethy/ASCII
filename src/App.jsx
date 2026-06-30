import { useCallback, useEffect, useRef, useState } from "react";
import ImageUploader from "./components/ImageUploader";
import Controls from "./components/Controls";
import AsciiOutput from "./components/AsciiOutput";
import { imageToAscii } from "./lib/asciiConverter";
import { charsets, charsetPorDefecto } from "./lib/charsets";
import { useWebcam } from "./hooks/useWebcam";
import "./styles.css";

// Traduce el estado de opciones a los argumentos de imageToAscii.
function construirRows(fuente, o) {
  return imageToAscii(fuente, {
    width: o.width,
    charset: charsets[o.charsetKey],
    invert: o.invert,
    brightness: o.brightness,
    contrast: o.contrast,
    gamma: o.gamma,
    edges: o.edges,
    edgeThreshold: o.edgeThreshold,
  });
}

export default function App() {
  const [image, setImage] = useState(null);
  const [nombre, setNombre] = useState("");
  const [live, setLive] = useState(false);
  const [errorCam, setErrorCam] = useState("");
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
  });

  // Las opciones más recientes, accesibles desde el bucle de la webcam sin
  // tener que reiniciarlo en cada cambio.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const actualizar = (cambios) => setOpts((prev) => ({ ...prev, ...cambios }));

  // Modo imagen estática: recalcular cuando cambian la imagen o las opciones.
  useEffect(() => {
    if (live || !image) return;
    setRows(construirRows(image, opts));
  }, [live, image, opts]);

  // Modo webcam en vivo: cada fotograma genera una nueva matriz ASCII.
  const onFrame = useCallback((video) => {
    setRows(construirRows(video, optsRef.current));
  }, []);
  const videoRef = useWebcam(live, onFrame, (err) => {
    setErrorCam("No se pudo acceder a la cámara: " + (err?.message || err));
    setLive(false);
  });

  const usarImagen = (img, name) => {
    setLive(false);
    setErrorCam("");
    setImage(img);
    setNombre(name);
  };

  const alternarWebcam = () => {
    setErrorCam("");
    if (live) {
      setLive(false); // congela el último fotograma
    } else {
      setImage(null);
      setNombre("");
      setLive(true);
    }
  };

  return (
    <main className="app">
      <header>
        <h1>Conversor de Imágenes a ASCII</h1>
        {nombre && <p className="archivo">{nombre}</p>}
      </header>

      <div className="fuente">
        <ImageUploader onImage={usarImagen} />
        <button
          type="button"
          className={`webcam-btn ${live ? "webcam-btn--activo" : ""}`}
          onClick={alternarWebcam}
        >
          {live ? "■ Detener webcam" : "● Usar webcam"}
        </button>
      </div>

      {errorCam && <p className="error">{errorCam}</p>}

      <Controls {...opts} onChange={actualizar} disabled={!image && !live} />

      <AsciiOutput rows={rows} colorMode={opts.colorMode} />

      {/* Vídeo oculto que alimenta la conversión en modo webcam. */}
      <video ref={videoRef} playsInline muted style={{ display: "none" }} />
    </main>
  );
}
