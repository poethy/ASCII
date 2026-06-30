import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { asciiToCanvas } from "./asciiConverter";
import { rowsDeFuente } from "./convertir";
import { visualizarAudio } from "./audioViz";

// Tamaño de fuente para los fotogramas exportados (más pequeño = archivos más
// ligeros, sobre todo en GIF).
const FONT_EXPORT = 10;
// Tope de fotogramas del GIF: para vídeos largos baja la tasa efectiva en vez
// de generar un archivo gigantesco.
const GIF_MAX_FRAMES = 300;
const GIF_FPS = 12;
const WEBM_FPS = 24;

// Mueve el vídeo a un instante y resuelve cuando el fotograma está listo.
function buscar(video, t) {
  return new Promise((res) => {
    const h = () => {
      video.removeEventListener("seeked", h);
      res();
    };
    video.addEventListener("seeked", h);
    video.currentTime = t;
  });
}

function fotogramaCanvas(video, o) {
  return asciiToCanvas(rowsDeFuente(video, o), {
    colorMode: o.colorMode,
    fontSize: FONT_EXPORT,
  });
}

/**
 * Exporta el vídeo completo como GIF animado, recorriéndolo fotograma a
 * fotograma (offline). Devuelve un Blob image/gif.
 *
 * @param {HTMLVideoElement} video
 * @param {object} o - opciones de conversión de la app.
 * @param {(p:number)=>void} [onProgress] - progreso 0..1.
 */
export async function exportarGif(video, o, onProgress) {
  const dur = video.duration || 0;
  const total = Math.max(1, Math.min(GIF_MAX_FRAMES, Math.floor(dur * GIF_FPS)));
  const delay = Math.round((1000 * dur) / total); // reparte la duración real
  const gif = GIFEncoder();

  for (let i = 0; i < total; i++) {
    await buscar(video, (i / total) * dur);
    const canvas = fotogramaCanvas(video, o);
    const ctx = canvas.getContext("2d");
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay });
    onProgress?.((i + 1) / total);
  }

  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}

/**
 * Exporta el vídeo como WebM grabando en tiempo real un canvas con el render
 * ASCII de cada fotograma (MediaRecorder). Devuelve un Blob video/webm.
 *
 * @param {HTMLVideoElement} video
 * @param {object} o - opciones de conversión de la app.
 * @param {(p:number)=>void} [onProgress] - progreso 0..1.
 */
export async function exportarWebM(video, o, onProgress) {
  const dur = video.duration || 0;

  // El tamaño del canvas debe ser constante durante toda la grabación; lo
  // fijamos a partir del primer fotograma (cols y proporción no cambian).
  await buscar(video, 0);
  const primero = fotogramaCanvas(video, o);
  const canvas = document.createElement("canvas");
  canvas.width = primero.width;
  canvas.height = primero.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(primero, 0, 0);

  const stream = canvas.captureStream(WEBM_FPS);
  const tipo = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: tipo });
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const parado = new Promise((res) => {
    rec.onstop = res;
  });

  rec.start();
  await new Promise((resolve) => {
    let raf;
    let cancel = false;
    const draw = () => {
      if (cancel) return;
      ctx.drawImage(fotogramaCanvas(video, o), 0, 0);
      onProgress?.(dur ? Math.min(1, video.currentTime / dur) : 0);
      if (video.ended || (dur && video.currentTime >= dur - 0.05)) {
        cancel = true;
        resolve();
        return;
      }
      raf = requestAnimationFrame(draw);
    };
    video.play();
    raf = requestAnimationFrame(draw);
    // Guardar para poder cancelar si el componente se desmonta no es necesario
    // aquí porque la promesa resuelve al terminar el vídeo.
    void raf;
  });

  rec.stop();
  await parado;
  video.pause();
  return new Blob(chunks, { type: "video/webm" });
}

/**
 * Exporta el visualizador de audio como WebM incluyendo la pista de audio.
 * Graba en tiempo real un canvas con el render ASCII de cada fotograma del
 * analyser, combinado con el audio del grafo Web Audio.
 *
 * @param {HTMLAudioElement} audio
 * @param {AnalyserNode} analyser
 * @param {MediaStreamAudioDestinationNode} streamDest - salida de audio del grafo.
 * @param {object} o - opciones de conversión (width, colorMode, vizStyle).
 * @param {(p:number)=>void} [onProgress] - progreso 0..1.
 */
export async function exportarAudioWebM(audio, analyser, streamDest, o, onProgress) {
  if (!analyser || !streamDest) throw new Error("El audio no está inicializado");
  const dur = audio.duration || 0;

  const primero = asciiToCanvas(visualizarAudio(analyser, o), {
    colorMode: o.colorMode,
    fontSize: FONT_EXPORT,
  });
  const canvas = document.createElement("canvas");
  canvas.width = primero.width;
  canvas.height = primero.height;
  const ctx = canvas.getContext("2d");

  const vstream = canvas.captureStream(WEBM_FPS);
  const combinado = new MediaStream([
    ...vstream.getVideoTracks(),
    ...streamDest.stream.getAudioTracks(),
  ]);
  const tipo = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";
  const rec = new MediaRecorder(combinado, { mimeType: tipo });
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const parado = new Promise((res) => {
    rec.onstop = res;
  });

  audio.currentTime = 0;
  rec.start();
  await audio.play();
  await new Promise((resolve) => {
    let raf;
    let cancel = false;
    const draw = () => {
      if (cancel) return;
      ctx.drawImage(
        asciiToCanvas(visualizarAudio(analyser, o), {
          colorMode: o.colorMode,
          fontSize: FONT_EXPORT,
        }),
        0,
        0
      );
      onProgress?.(dur ? Math.min(1, audio.currentTime / dur) : 0);
      if (audio.ended || (dur && audio.currentTime >= dur - 0.05)) {
        cancel = true;
        resolve();
        return;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    void raf;
  });

  rec.stop();
  await parado;
  audio.pause();
  return new Blob(chunks, { type: "video/webm" });
}
