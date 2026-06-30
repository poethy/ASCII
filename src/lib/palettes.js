import { hsl, lerp, clamp01 } from "./color";

// Cada paleta mapea una intensidad t (0..1) -> [r,g,b]. Se usan en el
// visualizador de audio (t = altura, ángulo, etc. según el modo).
export const paletas = [
  { key: "clasico", label: "Clásico", fn: (t) => hsl(140 - clamp01(t) * 140, 0.85, 0.55) },
  { key: "fuego", label: "Fuego", fn: (t) => hsl(lerp(0, 50, clamp01(t)), 0.9, lerp(0.35, 0.6, clamp01(t))) },
  { key: "oceano", label: "Océano", fn: (t) => hsl(lerp(220, 165, clamp01(t)), 0.85, lerp(0.4, 0.62, clamp01(t))) },
  { key: "neon", label: "Neón", fn: (t) => hsl(lerp(300, 180, clamp01(t)), 0.95, 0.6) },
  { key: "arcoiris", label: "Arcoíris", fn: (t) => hsl(clamp01(t) * 320, 0.85, 0.55) },
  {
    key: "mono",
    label: "Mono",
    fn: (t) => {
      const g = Math.round(lerp(90, 255, clamp01(t)));
      return [g, g, g];
    },
  },
];

export function paletaFn(key) {
  return (paletas.find((p) => p.key === key) || paletas[0]).fn;
}
