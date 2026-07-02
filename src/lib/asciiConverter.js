// Lógica pura de conversión imagen -> ASCII. Sin dependencias de React.
//
// La salida es una matriz de filas; cada celda es { char, r, g, b }, de modo
// que la misma estructura sirve para texto plano (solo `char`) y para color.

// Factor que corrige que los caracteres monoespaciados son más altos que
// anchos (~2:1), así el arte no sale estirado verticalmente.
const ASPECTO_CARACTER = 0.5;

/**
 * Construye una tabla de búsqueda (256 entradas) que mapea cada valor de canal
 * 0..255 a su versión ajustada por brillo, contraste y gamma. Aplicar la LUT a
 * cada canal es mucho más rápido que recalcular las fórmulas por píxel.
 *
 * @param {number} brightness - desplazamiento -100..100 (0 = sin cambio).
 * @param {number} contrast - intensidad -100..100 (0 = sin cambio).
 * @param {number} gamma - corrección gamma 0.1..3 (1 = sin cambio).
 * @returns {Uint8ClampedArray}
 */
function construirLUT(brightness, contrast, gamma) {
  // Fórmula estándar de contraste: factor centrado en 128.
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const invGamma = 1 / gamma;
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let v = i + brightness; // brillo
    v = factor * (v - 128) + 128; // contraste
    v = 255 * Math.pow(Math.max(0, v) / 255, invGamma); // gamma
    lut[i] = v; // Uint8ClampedArray recorta automáticamente a 0..255
  }
  return lut;
}

// LUT identidad: se usa cuando los tres ajustes están en su valor neutro.
const LUT_IDENTIDAD = construirLUT(0, 0, 1);

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

// Magnitud máxima teórica del operador Sobel para canales 0..255
// (suma de pesos positivos = 4, por 255).
const SOBEL_MAX = 1020;

/**
 * Decide el carácter de una celda en modo "detección de bordes" usando el
 * operador Sobel sobre la rejilla de luminancia. Si el borde supera el umbral,
 * devuelve un carácter direccional (| - / \) alineado con la orientación del
 * borde; si no, un espacio.
 */
function caracterBorde(lum, x, y, cols, rows, umbral) {
  const at = (xx, yy) =>
    lum[clamp(yy, 0, rows - 1) * cols + clamp(xx, 0, cols - 1)];
  const tl = at(x - 1, y - 1);
  const tc = at(x, y - 1);
  const tr = at(x + 1, y - 1);
  const ml = at(x - 1, y);
  const mr = at(x + 1, y);
  const bl = at(x - 1, y + 1);
  const bc = at(x, y + 1);
  const br = at(x + 1, y + 1);

  const gx = tr + 2 * mr + br - (tl + 2 * ml + bl);
  const gy = bl + 2 * bc + br - (tl + 2 * tc + tr);
  const mag = Math.sqrt(gx * gx + gy * gy) / SOBEL_MAX;
  if (mag < umbral / 100) return " ";

  // El carácter representa la línea del borde (perpendicular al gradiente).
  let ang = (Math.atan2(gy, gx) * 180) / Math.PI;
  if (ang < 0) ang += 180;
  if (ang < 22.5 || ang >= 157.5) return "|";
  if (ang < 67.5) return "\\";
  if (ang < 112.5) return "-";
  return "/";
}

// Valor de bit de cada punto braille según su posición (x:0..1, y:0..3) dentro
// de la celda de 2×4 puntos. El carácter es U+2800 + (suma de bits activos).
const BRAILLE_DOTS = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
];

/**
 * Convierte la imagen a arte braille: cada carácter (U+28xx) representa una
 * rejilla de 2×4 puntos, muestreando la imagen a cols*2 × rows*4 y encendiendo
 * un punto cuando el subpíxel es "tinta" (oscuro, o claro si `invert`).
 */
function imagenABraille(image, cols, rows, lut, invert) {
  const cw = cols * 2;
  const ch = rows * 4;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, cw, ch);
  const { data } = ctx.getImageData(0, 0, cw, ch);

  const result = [];
  for (let cy = 0; cy < rows; cy++) {
    const row = [];
    for (let cx = 0; cx < cols; cx++) {
      let bits = 0;
      let rs = 0;
      let gs = 0;
      let bs = 0;
      for (let dx = 0; dx < 2; dx++) {
        for (let dy = 0; dy < 4; dy++) {
          const i = ((cy * 4 + dy) * cw + (cx * 2 + dx)) * 4;
          const r = lut[data[i]];
          const g = lut[data[i + 1]];
          const b = lut[data[i + 2]];
          rs += r;
          gs += g;
          bs += b;
          const lumv = 0.299 * r + 0.587 * g + 0.114 * b;
          let on = lumv < 128; // píxel oscuro = punto (tinta)
          if (invert) on = !on;
          if (on) bits |= BRAILLE_DOTS[dx][dy];
        }
      }
      row.push({
        char: String.fromCharCode(0x2800 + bits),
        r: Math.round(rs / 8),
        g: Math.round(gs / 8),
        b: Math.round(bs / 8),
      });
    }
    result.push(row);
  }
  return result;
}

/**
 * Convierte una imagen ya cargada en una matriz de celdas ASCII.
 *
 * @param {HTMLImageElement|ImageBitmap} image - imagen cargada y lista.
 * @param {object} opts
 * @param {number} opts.width - número de columnas (caracteres por fila).
 * @param {string} opts.charset - rampa de caracteres (oscuro -> claro).
 * @param {boolean} opts.invert - invierte el mapeo claro/oscuro.
 * @param {number} [opts.brightness] - brillo -100..100 (0 por defecto).
 * @param {number} [opts.contrast] - contraste -100..100 (0 por defecto).
 * @param {number} [opts.gamma] - gamma 0.1..3 (1 por defecto).
 * @param {boolean} [opts.edges] - modo detección de bordes (Sobel).
 * @param {number} [opts.edgeThreshold] - umbral de borde 0..100 (20 por defecto).
 * @returns {Array<Array<{char:string,r:number,g:number,b:number}>>}
 */
export function imageToAscii(
  image,
  {
    width,
    charset,
    invert,
    brightness = 0,
    contrast = 0,
    gamma = 1,
    edges = false,
    edgeThreshold = 20,
    braille = false,
  }
) {
  const cols = Math.max(1, Math.floor(width));
  // Las fuentes de vídeo exponen videoWidth/Height; las imágenes width/height.
  const srcW = image.videoWidth || image.naturalWidth || image.width;
  const srcH = image.videoHeight || image.naturalHeight || image.height;
  const ratio = srcH / srcW;
  const rows = Math.max(1, Math.round(cols * ratio * ASPECTO_CARACTER));

  const neutro = brightness === 0 && contrast === 0 && gamma === 1;
  const lut = neutro ? LUT_IDENTIDAD : construirLUT(brightness, contrast, gamma);

  // Modo braille: cada carácter cubre una rejilla de 2×4 puntos.
  if (braille) return imagenABraille(image, cols, rows, lut, invert);

  // Canvas fuera de pantalla del tamaño de la rejilla ASCII: drawImage hace
  // el downscaling promediando los píxeles por nosotros.
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, cols, rows);

  const { data } = ctx.getImageData(0, 0, cols, rows);
  const ramp = charset;
  const lastIndex = ramp.length - 1;

  // Primer paso: color ajustado por celda + rejilla de luminancia (la necesita
  // Sobel, que mira los vecinos de cada celda).
  const n = cols * rows;
  const R = new Uint8Array(n);
  const G = new Uint8Array(n);
  const B = new Uint8Array(n);
  const lum = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const r = lut[data[i]];
    const g = lut[data[i + 1]];
    const b = lut[data[i + 2]];
    R[p] = r;
    G[p] = g;
    B[p] = b;
    lum[p] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Segundo paso: elegir el carácter de cada celda.
  const result = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const p = y * cols + x;
      let char;
      if (edges) {
        char = caracterBorde(lum, x, y, cols, rows, edgeThreshold);
      } else {
        let t = lum[p] / 255; // 0 = oscuro, 1 = claro
        if (invert) t = 1 - t;
        char = ramp[Math.round(t * lastIndex)];
      }
      row.push({ char, r: R[p], g: G[p], b: B[p] });
    }
    result.push(row);
  }
  return result;
}

/**
 * Une las celdas en un único string de texto plano (ignora el color).
 * @param {Array<Array<{char:string}>>} rows
 * @returns {string}
 */
export function asciiToText(rows) {
  return rows.map((row) => row.map((cell) => cell.char).join("")).join("\n");
}

/**
 * Dibuja la matriz ASCII en un <canvas> para poder exportarla como imagen.
 *
 * @param {Array<Array<{char:string,r:number,g:number,b:number}>>} rows
 * @param {object} opts
 * @param {boolean} opts.colorMode - usa el color de cada celda; si no, monocromo.
 * @param {number} opts.fontSize - tamaño de fuente en px.
 * @param {string} opts.background - color de fondo.
 * @param {string} opts.foreground - color del texto en modo monocromo.
 * @returns {HTMLCanvasElement}
 */
export function asciiToCanvas(
  rows,
  { colorMode = false, fontSize = 12, background = "#000000", foreground = "#dddddd" } = {}
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = `${fontSize}px ui-monospace, Consolas, "Courier New", monospace`;

  // Medir el ancho de carácter con la fuente final.
  ctx.font = font;
  const charW = ctx.measureText("M").width;
  const lineH = fontSize; // coincide con el line-height de la vista previa

  const cols = rows[0]?.length ?? 0;
  canvas.width = Math.max(1, Math.ceil(charW * cols));
  canvas.height = Math.max(1, Math.ceil(lineH * rows.length));

  // Redimensionar el canvas resetea el contexto: re-aplicar la fuente.
  ctx.font = font;
  ctx.textBaseline = "top";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < cols; x++) {
      const cell = row[x];
      if (cell.char === " ") continue; // el fondo ya cubre los espacios
      ctx.fillStyle = colorMode ? `rgb(${cell.r},${cell.g},${cell.b})` : foreground;
      ctx.fillText(cell.char, x * charW, y * lineH);
    }
  }
  return canvas;
}
