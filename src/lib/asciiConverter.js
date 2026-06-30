// Lógica pura de conversión imagen -> ASCII. Sin dependencias de React.
//
// La salida es una matriz de filas; cada celda es { char, r, g, b }, de modo
// que la misma estructura sirve para texto plano (solo `char`) y para color.

// Factor que corrige que los caracteres monoespaciados son más altos que
// anchos (~2:1), así el arte no sale estirado verticalmente.
const ASPECTO_CARACTER = 0.5;

/**
 * Convierte una imagen ya cargada en una matriz de celdas ASCII.
 *
 * @param {HTMLImageElement|ImageBitmap} image - imagen cargada y lista.
 * @param {object} opts
 * @param {number} opts.width - número de columnas (caracteres por fila).
 * @param {string} opts.charset - rampa de caracteres (oscuro -> claro).
 * @param {boolean} opts.invert - invierte el mapeo claro/oscuro.
 * @returns {Array<Array<{char:string,r:number,g:number,b:number}>>}
 */
export function imageToAscii(image, { width, charset, invert }) {
  const cols = Math.max(1, Math.floor(width));
  const ratio = image.height / image.width;
  const rows = Math.max(1, Math.round(cols * ratio * ASPECTO_CARACTER));

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

  const result = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Luminancia perceptual (0..255).
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      let t = lum / 255; // 0 = oscuro, 1 = claro
      if (invert) t = 1 - t;

      const index = Math.round(t * lastIndex);
      row.push({ char: ramp[index], r, g, b });
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
