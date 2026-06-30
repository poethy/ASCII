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
