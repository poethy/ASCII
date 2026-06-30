// Visualizador de audio en ASCII. A partir de un AnalyserNode de la Web Audio
// API construye una matriz de celdas { char, r, g, b } (mismo formato que el
// resto de la app) según el estilo elegido.

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
const CELDA_VACIA = { char: " ", r: 0, g: 0, b: 0 };
const BLOQUE = "█";
const TAU = Math.PI * 2;

// Conversión HSL -> RGB (h en grados, s/l en 0..1) -> [r,g,b] 0..255.
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
 * Magnitudes por columna (0..1) con escala LOGARÍTMICA de frecuencias: cada
 * columna cubre un rango de bins repartido en log, de modo que graves y agudos
 * tienen un peso visual parecido (en vez de amontonarse los graves).
 */
function magnitudesLog(analyser, cols) {
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
    // Realce suave para que el visualizador tenga más cuerpo.
    vals[x] = Math.pow((c ? s / c : 0) / 255, 0.8);
  }
  return vals;
}

function nivelGlobal(analyser) {
  const { freq } = buffers(analyser);
  analyser.getByteFrequencyData(freq);
  const n = Math.floor(freq.length * 0.5);
  let s = 0;
  for (let i = 0; i < n; i++) s += freq[i];
  return s / n / 255;
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
function barras(cols, rows, vals, mirror) {
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
      if (on) setCell(grid, x, y, hsl(140 - clamp(frac, 0, 1) * 140, 0.85, 0.55));
    }
  }
  return grid;
}

// --- Línea de espectro; si `fill`, rellena por debajo (montaña). ---
function linea(cols, rows, vals, fill) {
  const grid = rejillaVacia(cols, rows);
  let prevY = null;
  for (let x = 0; x < cols; x++) {
    const v = vals[x];
    const y = Math.round((1 - v) * (rows - 1));
    if (fill) {
      for (let yy = y; yy < rows; yy++) {
        const f = (rows - yy) / rows;
        setCell(grid, x, yy, hsl(140 - clamp(f, 0, 1) * 140, 0.8, 0.5));
      }
    } else {
      const color = hsl(140 - clamp(v, 0, 1) * 140, 0.85, 0.6);
      const lo = prevY === null ? y : Math.min(prevY, y);
      const hi = prevY === null ? y : Math.max(prevY, y);
      for (let yy = lo; yy <= hi; yy++) setCell(grid, x, yy, color);
    }
    prevY = y;
  }
  return grid;
}

// --- Osciloscopio (forma de onda). ---
function onda(analyser, cols, rows) {
  const { time } = buffers(analyser);
  analyser.getByteTimeDomainData(time);
  const grid = rejillaVacia(cols, rows);
  const centro = (rows - 1) / 2;
  let prevY = null;
  for (let x = 0; x < cols; x++) {
    const idx = Math.floor((x / cols) * time.length);
    const y = Math.round((time[idx] / 255) * (rows - 1));
    const frac = 1 - Math.abs(y - centro) / (centro || 1);
    const color = hsl(280 - clamp(frac, 0, 1) * 120, 0.8, 0.6);
    const lo = prevY === null ? y : Math.min(prevY, y);
    const hi = prevY === null ? y : Math.max(prevY, y);
    for (let yy = lo; yy <= hi; yy++) setCell(grid, x, yy, color);
    prevY = y;
  }
  return grid;
}

// --- Barras radiales: salen del centro en círculo. ---
function radial(cols, rows, vals) {
  const grid = rejillaVacia(cols, rows);
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const maxR = Math.min(cols / 2, rows) * 0.95;
  const baseR = maxR * 0.22;
  const B = vals.length;
  for (let i = 0; i < B; i++) {
    const a = (i / B) * TAU;
    const len = baseR + vals[i] * (maxR - baseR);
    const color = hsl((i / B) * 360, 0.8, 0.6);
    for (let rr = baseR * 0.4; rr <= len; rr += 0.5) {
      // y se escala a la mitad porque los caracteres son ~2x más altos.
      setCell(grid, Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.5), color);
    }
  }
  return grid;
}

// --- Blob: círculo deformado cuyo radio varía con el espectro por ángulo. ---
function blob(cols, rows, vals) {
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
      if (dist <= baseR + v * (maxR - baseR)) {
        setCell(grid, x, y, hsl((a / TAU) * 360, 0.75, 0.55));
      }
    }
  }
  return grid;
}

// --- Siri: varias ondas senoidales superpuestas, con bulto central. ---
function siri(analyser, cols, rows) {
  analyser.__t = (analyser.__t || 0) + 1;
  const t = analyser.__t * 0.15;
  const L = clamp(nivelGlobal(analyser) * 1.6, 0, 1);
  const grid = rejillaVacia(cols, rows);
  const cy = (rows - 1) / 2;
  const ondas = [
    { f: 1, amp: 1.0, hue: 285 },
    { f: 1.6, amp: 0.7, hue: 205 },
    { f: 2.3, amp: 0.5, hue: 165 },
  ];
  for (let w = 0; w < ondas.length; w++) {
    const o = ondas[w];
    const color = hsl(o.hue, 0.85, 0.62);
    let prevY = null;
    for (let x = 0; x < cols; x++) {
      const nx = x / (cols - 1);
      const env = Math.exp(-Math.pow((nx - 0.5) / 0.34, 2)); // campana central
      const y = Math.round(
        cy + Math.sin(nx * TAU * o.f + t + w) * env * L * o.amp * (rows / 2)
      );
      if (prevY !== null) {
        const lo = Math.min(prevY, y);
        const hi = Math.max(prevY, y);
        for (let yy = lo; yy <= hi; yy++) setCell(grid, x, yy, color);
      } else {
        setCell(grid, x, y, color);
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
 * @param {object} o - opciones (usa width, colorMode, vizStyle).
 * @returns {Array<Array<{char:string,r:number,g:number,b:number}>>|null}
 */
export function visualizarAudio(analyser, o) {
  if (!analyser) return null;
  const cols = Math.max(8, Math.floor(o.width));
  const rows = clamp(Math.round(cols * 0.5), 10, 60);
  switch (o.vizStyle) {
    case "wave":
      return onda(analyser, cols, rows);
    case "line":
      return linea(cols, rows, magnitudesLog(analyser, cols), false);
    case "mountain":
      return linea(cols, rows, magnitudesLog(analyser, cols), true);
    case "mirror":
      return barras(cols, rows, magnitudesLog(analyser, cols), true);
    case "radial":
      return radial(cols, rows, magnitudesLog(analyser, Math.min(72, cols)));
    case "blob":
      return blob(cols, rows, magnitudesLog(analyser, 64));
    case "siri":
      return siri(analyser, cols, rows);
    case "bar":
    default:
      return barras(cols, rows, magnitudesLog(analyser, cols), false);
  }
}
