// Preferencias sencillas persistidas en localStorage (mismo enfoque que
// presets.js: acceso envuelto en try/catch para no romper en modo privado).

const LANG_KEY = "ascii-textronix-lang";

/** @returns {"es"|"en"|null} idioma guardado, o null si no hay/está corrupto. */
export function leerIdioma() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === "en" || v === "es" ? v : null;
  } catch {
    return null;
  }
}

/** Guarda el idioma elegido. */
export function guardarIdioma(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // localStorage puede fallar (modo privado, cuota); no es crítico.
  }
}
