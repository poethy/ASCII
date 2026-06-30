import { imageToAscii } from "./asciiConverter";
import { charsets } from "./charsets";

// Traduce el estado de opciones de la app (con clave de charset) a los
// argumentos que espera imageToAscii. Compartido entre la vista en vivo y la
// exportación de vídeo para que todo use exactamente la misma conversión.
export function rowsDeFuente(fuente, o) {
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
