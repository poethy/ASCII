// Presets de configuración guardados en localStorage: permiten al usuario
// guardar/cargar/borrar combinaciones completas de opciones (ancho, charset,
// ajustes de imagen, bordes, paleta y ganancia de audio) con un nombre.

const STORAGE_KEY = "ascii-textronix-presets";

// Claves de `opts` que forman parte de un preset (se excluye lo que depende
// de la fuente actual, como vizStyle si quisiéramos separarlo; aquí se
// guarda todo el objeto de opciones tal cual).
function leerTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function escribirTodos(presets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // localStorage puede fallar (modo privado, cuota); no es crítico.
  }
}

/** @returns {string[]} nombres de los presets guardados, orden alfabético. */
export function listarPresets() {
  return Object.keys(leerTodos()).sort((a, b) => a.localeCompare(b));
}

/** @returns {object|null} las opciones guardadas bajo `nombre`, o null. */
export function obtenerPreset(nombre) {
  const presets = leerTodos();
  return presets[nombre] ?? null;
}

/** Guarda `opts` bajo `nombre`, sobrescribiendo si ya existía. */
export function guardarPreset(nombre, opts) {
  const presets = leerTodos();
  presets[nombre] = { ...opts };
  escribirTodos(presets);
}

/** Elimina el preset `nombre`. */
export function borrarPreset(nombre) {
  const presets = leerTodos();
  delete presets[nombre];
  escribirTodos(presets);
}
