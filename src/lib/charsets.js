// Rampas de caracteres ordenadas de OSCURO -> CLARO.
// El primer carácter representa las zonas más oscuras de la imagen y el
// último (normalmente un espacio) las más claras.

export const charsets = {
  detallada: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  estandar: "@%#*+=-:. ",
  simple: "#+-. ",
  bloques: "█▓▒░ ", // █ ▓ ▒ ░ (espacio)
};

// Clave por defecto usada al iniciar la app.
export const charsetPorDefecto = "estandar";
