// Visualizador de audio en ASCII. A partir de un AnalyserNode de la Web Audio
// API construye una matriz de celdas { char, r, g, b } (mismo formato que el
// resto de la app) según el estilo, la paleta y la ganancia elegidos.

import { paletaFn } from "./palettes";

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
const CELDA_VACIA = { char: " ", r: 0, g: 0, b: 0 };
const BLOQUE = "█";
const TAU = Math.PI * 2;

// Buffers reutilizables colgados del analyser para no reasignar cada fotograma.
function buffers(analyser) {
  const n = analyser.frequencyBinCount;
  if (!analyser.__freq || analyser.__freq.length !== n) {
    analyser.__freq = new Uint8Array(n);
    analyser.__time = new Uint8Array(analyser.fftSize);
  }
  return { freq: analyser.__freq, time: analyser.__time };
}

/**
 * Magnitudes por columna (0..1) con escala LOGARÍTMICA de frecuencias y la
 * ganancia aplicada: graves y agudos pesan parecido, y `gain` amplifica o
 * atenúa la reacción global.
 */
function magnitudesLog(analyser, cols, gain) {
  const { freq } = buffers(analyser);
  analyser.getByteFrequencyData(freq);
  const n = freq.length;
  const minBin = 1;
  const maxBin = Math.floor(n * 0.85);
  const ratio = maxBin / minBin;
  const vals = new Float32Array(cols);
  for (let x = 0; x < cols; x++) {
    const b0 = Math.floor(minBin * Math.pow(ratio, x / cols));
    let b1 = Math.floor(minBin * Math.pow(ratio, (x + 1) / cols));
    if (b1 <= b0) b1 = b0 + 1;
    let s = 0;
    let c = 0;
    for (let i = b0; i < b1 && i < n; i++) {
      s += freq[i];
      c++;
    }
    vals[x] = clamp(Math.pow((c ? s / c : 0) / 255, 0.8) * gain, 0, 1);
  }
  return vals;
}

function nivelGlobal(analyser, gain) {
  const { freq } = buffers(analyser);
  analyser.getByteFrequencyData(freq);
  const n = Math.floor(freq.length * 0.5);
  let s = 0;
  for (let i = 0; i < n; i++) s += freq[i];
  return clamp((s / n / 255) * gain, 0, 1);
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

function setCell(grid, x, y, rgb) {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
    grid[y][x] = { char: BLOQUE, r: rgb[0], g: rgb[1], b: rgb[2] };
  }
}

// --- Barras (de espectro). Si `mirror`, crecen desde el centro. ---
function barras(cols, rows, vals, color, mirror) {
  const grid = rejillaVacia(cols, rows);
  const centro = (rows - 1) / 2;
  for (let x = 0; x < cols; x++) {
    const v = vals[x];
    for (let y = 0; y < rows; y++) {
      let on;
      let frac;
      if (mirror) {
        on = Math.abs(y - centro) <= v * (rows / 2);
        frac = 1 - Math.abs(y - centro) / (rows / 2);
      } else {
        on = y >= rows - v * rows;
        frac = (rows - y) / rows;
      }
      if (on) setCell(grid, x, y, color(frac));
    }
  }
  return grid;
}

// --- Línea de espectro; si `fill`, rellena por debajo (montaña). ---
function linea(cols, rows, vals, color, fill) {
  const grid = rejillaVacia(cols, rows);
  let prevY = null;
  for (let x = 0; x < cols; x++) {
    const v = vals[x];
    const y = Math.round((1 - v) * (rows - 1));
    if (fill) {
      for (let yy = y; yy < rows; yy++) setCell(grid, x, yy, color((rows - yy) / rows));
    } else {
      const c = color(v);
      const lo = prevY === null ? y : Math.min(prevY, y);
      const hi = prevY === null ? y : Math.max(prevY, y);
      for (let yy = lo; yy <= hi; yy++) setCell(grid, x, yy, c);
    }
    prevY = y;
  }
  return grid;
}

// --- Osciloscopio (forma de onda). ---
function onda(analyser, cols, rows, color) {
  const { time } = buffers(analyser);
  analyser.getByteTimeDomainData(time);
  const grid = rejillaVacia(cols, rows);
  const centro = (rows - 1) / 2;
  let prevY = null;
  for (let x = 0; x < cols; x++) {
    const idx = Math.floor((x / cols) * time.length);
    const y = Math.round((time[idx] / 255) * (rows - 1));
    const c = color(Math.abs(y - centro) / (centro || 1));
    const lo = prevY === null ? y : Math.min(prevY, y);
    const hi = prevY === null ? y : Math.max(prevY, y);
    for (let yy = lo; yy <= hi; yy++) setCell(grid, x, yy, c);
    prevY = y;
  }
  return grid;
}

// --- Barras radiales: salen del centro en círculo. ---
function radial(cols, rows, vals, color) {
  const grid = rejillaVacia(cols, rows);
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const maxR = Math.min(cols / 2, rows) * 0.95;
  const baseR = maxR * 0.22;
  const B = vals.length;
  for (let i = 0; i < B; i++) {
    const a = (i / B) * TAU;
    const len = baseR + vals[i] * (maxR - baseR);
    const c = color(i / B);
    for (let rr = baseR * 0.4; rr <= len; rr += 0.5) {
      // y se escala a la mitad porque los caracteres son ~2x más altos.
      setCell(grid, Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.5), c);
    }
  }
  return grid;
}

// --- Blob: círculo deformado cuyo radio varía con el espectro por ángulo. ---
function blob(cols, rows, vals, color) {
  const grid = rejillaVacia(cols, rows);
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const maxR = Math.min(cols / 2, rows) * 0.95;
  const baseR = maxR * 0.4;
  const B = vals.length;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = x - cx;
      const dy = (y - cy) * 2; // corrige el aspecto de los caracteres
      const dist = Math.sqrt(dx * dx + dy * dy);
      let a = Math.atan2(dy, dx);
      if (a < 0) a += TAU;
      const v = vals[Math.floor((a / TAU) * B) % B];
      if (dist <= baseR + v * (maxR - baseR)) setCell(grid, x, y, color(a / TAU));
    }
  }
  return grid;
}

// --- Siri: varias ondas senoidales superpuestas, con bulto central. ---
function siri(analyser, cols, rows, color, gain) {
  analyser.__t = (analyser.__t || 0) + 1;
  const t = analyser.__t * 0.15;
  const L = clamp(nivelGlobal(analyser, gain) * 1.6, 0, 1);
  const grid = rejillaVacia(cols, rows);
  const cy = (rows - 1) / 2;
  const ondas = [
    { f: 1, amp: 1.0 },
    { f: 1.6, amp: 0.7 },
    { f: 2.3, amp: 0.5 },
  ];
  for (let w = 0; w < ondas.length; w++) {
    const o = ondas[w];
    const c = color(w / (ondas.length - 1));
    let prevY = null;
    for (let x = 0; x < cols; x++) {
      const nx = x / (cols - 1);
      const env = Math.exp(-Math.pow((nx - 0.5) / 0.34, 2)); // campana central
      const y = Math.round(cy + Math.sin(nx * TAU * o.f + t + w) * env * L * o.amp * (rows / 2));
      if (prevY !== null) {
        const lo = Math.min(prevY, y);
        const hi = Math.max(prevY, y);
        for (let yy = lo; yy <= hi; yy++) setCell(grid, x, yy, c);
      } else {
        setCell(grid, x, y, c);
      }
      prevY = y;
    }
  }
  return grid;
}

// Estilos disponibles (clave + etiqueta para el selector).
export const estilosViz = [
  { key: "bar", label: "Bar" },
  { key: "wave", label: "Wave" },
  { key: "line", label: "Line" },
  { key: "radial", label: "Radial Bars" },
  { key: "mirror", label: "Mirror Bars" },
  { key: "mountain", label: "Mountain" },
  { key: "blob", label: "Blob" },
  { key: "siri", label: "Siri" },
];

/**
 * Construye la matriz ASCII del visualizador para el fotograma actual.
 *
 * @param {AnalyserNode} analyser
 * @param {object} o - opciones (usa width, vizStyle, palette, gain).
 * @returns {Array<Array<{char:string,r:number,g:number,b:number}>>|null}
 */
export function visualizarAudio(analyser, o) {
  if (!analyser) return null;
  const cols = Math.max(8, Math.floor(o.width));
  const rows = clamp(Math.round(cols * 0.5), 10, 60);
  const gain = o.gain ?? 1;
  const color = paletaFn(o.palette);
  switch (o.vizStyle) {
    case "wave":
      return onda(analyser, cols, rows, color);
    case "line":
      return linea(cols, rows, magnitudesLog(analyser, cols, gain), color, false);
    case "mountain":
      return linea(cols, rows, magnitudesLog(analyser, cols, gain), color, true);
    case "mirror":
      return barras(cols, rows, magnitudesLog(analyser, cols, gain), color, true);
    case "radial":
      return radial(cols, rows, magnitudesLog(analyser, Math.min(72, cols), gain), color);
    case "blob":
      return blob(cols, rows, magnitudesLog(analyser, 64, gain), color);
    case "siri":
      return siri(analyser, cols, rows, color, gain);
    case "bar":
    default:
      return barras(cols, rows, magnitudesLog(analyser, cols, gain), color, false);
  }
}
