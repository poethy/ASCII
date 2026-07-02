import { useState } from "react";
import { charsets } from "../lib/charsets";
import { listarPresets, obtenerPreset, guardarPreset, borrarPreset } from "../lib/presets";
import { useT } from "../lib/i18n";

function Toggle({ label, on, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`toggle ${on ? "toggle--on" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="toggle__led" />
    </button>
  );
}

// Guardar / cargar / borrar combinaciones completas de opciones en
// localStorage. `opts` son todas las opciones actuales de la app (no solo
// las que renderiza este panel), así el preset también recuerda paleta,
// estilo de visualizador y ganancia de audio.
function Presets({ opts, onChange, disabled }) {
  const t = useT();
  const [nombres, setNombres] = useState(() => listarPresets());
  const [seleccion, setSeleccion] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");

  const refrescar = () => {
    const lista = listarPresets();
    setNombres(lista);
    if (!lista.includes(seleccion)) setSeleccion("");
  };

  const guardar = () => {
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    guardarPreset(nombre, opts);
    setNombreNuevo("");
    setSeleccion(nombre);
    setNombres(listarPresets());
  };

  const cargar = () => {
    if (!seleccion) return;
    const preset = obtenerPreset(seleccion);
    if (preset) onChange(preset);
  };

  const borrar = () => {
    if (!seleccion) return;
    borrarPreset(seleccion);
    refrescar();
  };

  return (
    <div className="presets">
      <div className="control">
        <span>
          <span>{t.presets}</span>
        </span>
        <select
          value={seleccion}
          disabled={disabled || nombres.length === 0}
          onChange={(e) => setSeleccion(e.target.value)}
        >
          <option value="">
            {nombres.length === 0 ? t.presetNone : t.presetChoose}
          </option>
          {nombres.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="presets__row">
        <button type="button" className="btn" disabled={disabled || !seleccion} onClick={cargar}>
          {t.presetLoad}
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={disabled || !seleccion}
          onClick={borrar}
        >
          {t.presetDelete}
        </button>
      </div>
      <div className="presets__row">
        <input
          type="text"
          className="presets__input"
          placeholder={t.presetName}
          value={nombreNuevo}
          disabled={disabled}
          maxLength={40}
          onChange={(e) => setNombreNuevo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && guardar()}
        />
        <button
          type="button"
          className="btn"
          disabled={disabled || !nombreNuevo.trim()}
          onClick={guardar}
        >
          {t.presetSave}
        </button>
      </div>
    </div>
  );
}

export default function Controls({
  width,
  charsetKey,
  invert,
  colorMode,
  brightness,
  contrast,
  gamma,
  edges,
  edgeThreshold,
  braille,
  onChange,
  disabled,
  ...resto
}) {
  const t = useT();
  const ajustesNeutros = brightness === 0 && contrast === 0 && gamma === 1;
  const opts = {
    width,
    charsetKey,
    invert,
    colorMode,
    brightness,
    contrast,
    gamma,
    edges,
    edgeThreshold,
    braille,
    ...resto,
  };

  return (
    <>
      <div className="controls" data-disabled={disabled}>
        <label className="control">
          <span>
            <span>{t.width}</span>
            <span>{width}</span>
          </span>
          <input
            type="range"
            min="20"
            max="240"
            value={width}
            disabled={disabled}
            onChange={(e) => onChange({ width: Number(e.target.value) })}
          />
        </label>

        <label className="control">
          <span>
            <span>{t.charset}</span>
          </span>
          <select
            value={charsetKey}
            disabled={disabled}
            onChange={(e) => onChange({ charsetKey: e.target.value })}
          >
            {Object.keys(charsets).map((key) => (
              <option key={key} value={key}>
                {t.charsetLabels[key] || key}
              </option>
            ))}
          </select>
        </label>

        <label className="control">
          <span>
            <span>{t.brightness}</span>
            <span>{brightness}</span>
          </span>
          <input
            type="range"
            min="-100"
            max="100"
            value={brightness}
            disabled={disabled}
            onChange={(e) => onChange({ brightness: Number(e.target.value) })}
          />
        </label>

        <label className="control">
          <span>
            <span>{t.contrast}</span>
            <span>{contrast}</span>
          </span>
          <input
            type="range"
            min="-100"
            max="100"
            value={contrast}
            disabled={disabled}
            onChange={(e) => onChange({ contrast: Number(e.target.value) })}
          />
        </label>

        <label className="control">
          <span>
            <span>{t.gamma}</span>
            <span>{gamma.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={gamma}
            disabled={disabled}
            onChange={(e) => onChange({ gamma: Number(e.target.value) })}
          />
        </label>

        <label className="control">
          <span>
            <span>{t.edgeThr}</span>
            <span>{edgeThreshold}</span>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={edgeThreshold}
            disabled={disabled || !edges}
            onChange={(e) => onChange({ edgeThreshold: Number(e.target.value) })}
          />
        </label>
      </div>

      <div className="toggles">
        <Toggle
          label={t.invert}
          on={invert}
          disabled={disabled}
          onClick={() => onChange({ invert: !invert })}
        />
        <Toggle
          label={t.color}
          on={colorMode}
          disabled={disabled}
          onClick={() => onChange({ colorMode: !colorMode })}
        />
        <Toggle
          label={t.edges}
          on={edges}
          disabled={disabled}
          onClick={() => onChange({ edges: !edges })}
        />
        <Toggle
          label={t.braille}
          on={braille}
          disabled={disabled}
          onClick={() => onChange({ braille: !braille })}
        />
        <button
          type="button"
          className="btn-reset"
          disabled={disabled || ajustesNeutros}
          onClick={() => onChange({ brightness: 0, contrast: 0, gamma: 1 })}
        >
          {t.reset}
        </button>
      </div>

      <Presets opts={opts} onChange={onChange} disabled={disabled} />
    </>
  );
}
