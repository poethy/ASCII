// Visualizador de audio en ASCII. A partir de un AnalyserNode de la Web Audio
// API construye una matriz de celdas { char, r, g, b } (mismo formato que el
// resto de la app) según el estilo elegido.

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
const CELDA_VACIA = { char: " ", r: 0, g: 0, b: 0 };
const BLOQUE = "█";

// Conversión HSL -> RGB (h en grados 0..360, s/l en 0..1) -> [r,g,b] 0..255.
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

// Buffers reutilizables colgados del propio analyser para no reasignar cada
// fotograma (esto corre ~60 veces por segundo).
function buffers(analyser) {
  const n = analyser.frequencyBinCount;
  if (!analyser.__freq || analyser.__freq.length !== n) {
    analyser.__freq = new Uint8Array(n);
    analyser.__time = new Uint8Array(analyser.fftSize);
  }
  return { freq: analyser.__freq, time: analyser.__time };
}

function rejillaVacia(cols, rows) {
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = new Array(cols);
    for (let x = 0; x < cols; x++) row[x] = CELDA_VACIA;
    grid.push(row);
  }
  return grid;
}

// Barras de espectro (de graves a agudos). Si `mirror`, crecen desde el centro
// hacia arriba y abajo.
function spectrum(analyser, cols, rows, mirror) {
  const { freq } = buffers(analyser);
  analyser.getByteFrequencyData(freq);
  const usable = Math.floor(freq.length * 0.75); // los agudos suelen ir casi vacíos

  // Valor (0..1) por columna promediando su rango de bins.
  const vals = new Float32Array(cols);
  for (let x = 0; x < cols; x++) {
    const start = Math.floor((x / cols) * usable);
    const end = Math.max(start + 1, Math.floor(((x + 1) / cols) * usable));
    let s = 0;
    for (let i = start; i < end; i++) s += freq[i];
    vals[x] = s / (end - start) / 255;
  }

  const centro = (rows - 1) / 2;
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = new Array(cols);
    for (let x = 0; x < cols; x++) {
      const v = vals[x];
      let on;
      let frac;
      if (mirror) {
        const barHalf = v * (rows / 2);
        on = Math.abs(y - centro) <= barHalf;
        frac = 1 - Math.abs(y - centro) / (rows / 2);
      } else {
        on = y >= rows - v * rows;
        frac = (rows - y) / rows;
      }
      if (on) {
        const [r, g, b] = hsl(140 - clamp(frac, 0, 1) * 140, 0.85, 0.55);
        row[x] = { char: BLOQUE, r, g, b };
      } else {
        row[x] = CELDA_VACIA;
      }
    }
    grid.push(row);
  }
  return grid;
}

// Forma de onda (osciloscopio): una línea que ondula con la señal.
function waveform(analyser, cols, rows) {
  const { time } = buffers(analyser);
  analyser.getByteTimeDomainData(time);

  const ys = new Int16Array(cols);
  for (let x = 0; x < cols; x++) {
    const idx = Math.floor((x / cols) * time.length);
    ys[x] = Math.round((time[idx] / 255) * (rows - 1));
  }

  const grid = rejillaVacia(cols, rows);
  const centro = (rows - 1) / 2;
  for (let x = 0; x < cols; x++) {
    const y = ys[x];
    const yPrev = x > 0 ? ys[x - 1] : y;
    const lo = Math.min(y, yPrev);
    const hi = Math.max(y, yPrev);
    for (let yy = lo; yy <= hi; yy++) {
      const frac = 1 - Math.abs(yy - centro) / (centro || 1);
      const [r, g, b] = hsl(280 - clamp(frac, 0, 1) * 120, 0.8, 0.6);
      grid[yy][x] = { char: BLOQUE, r, g, b };
    }
  }
  return grid;
}

/**
 * Construye la matriz ASCII del visualizador para el fotograma actual.
 *
 * @param {AnalyserNode} analyser
 * @param {object} o - opciones de la app (usa width, colorMode, vizStyle).
 * @returns {Array<Array<{char:string,r:number,g:number,b:number}>>|null}
 */
export function visualizarAudio(analyser, o) {
  if (!analyser) return null;
  const cols = Math.max(8, Math.floor(o.width));
  const rows = clamp(Math.round(cols * 0.5), 10, 60);
  if (o.vizStyle === "waveform") return waveform(analyser, cols, rows);
  if (o.vizStyle === "mirror") return spectrum(analyser, cols, rows, true);
  return spectrum(analyser, cols, rows, false);
}
