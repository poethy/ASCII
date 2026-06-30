import { charsets } from "../lib/charsets";

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
  onChange,
  disabled,
}) {
  const ajustesNeutros = brightness === 0 && contrast === 0 && gamma === 1;

  return (
    <div className="controls" data-disabled={disabled}>
      <label className="control">
        <span>Ancho: {width} caracteres</span>
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
        <span>Caracteres</span>
        <select
          value={charsetKey}
          disabled={disabled}
          onChange={(e) => onChange({ charsetKey: e.target.value })}
        >
          {Object.keys(charsets).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </label>

      <label className="control control--check">
        <input
          type="checkbox"
          checked={invert}
          disabled={disabled}
          onChange={(e) => onChange({ invert: e.target.checked })}
        />
        <span>Invertir</span>
      </label>

      <label className="control control--check">
        <input
          type="checkbox"
          checked={colorMode}
          disabled={disabled}
          onChange={(e) => onChange({ colorMode: e.target.checked })}
        />
        <span>Color</span>
      </label>

      <label className="control">
        <span>Brillo: {brightness}</span>
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
        <span>Contraste: {contrast}</span>
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
        <span>Gamma: {gamma.toFixed(1)}</span>
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

      <button
        type="button"
        className="control__reset"
        disabled={disabled || ajustesNeutros}
        onClick={() => onChange({ brightness: 0, contrast: 0, gamma: 1 })}
      >
        Restablecer ajustes
      </button>

      <label className="control control--check">
        <input
          type="checkbox"
          checked={edges}
          disabled={disabled}
          onChange={(e) => onChange({ edges: e.target.checked })}
        />
        <span>Bordes (Sobel)</span>
      </label>

      <label className="control">
        <span>Umbral bordes: {edgeThreshold}</span>
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
  );
}
