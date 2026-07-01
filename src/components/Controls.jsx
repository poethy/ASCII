import { charsets } from "../lib/charsets";

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
    <>
      <div className="controls" data-disabled={disabled}>
        <label className="control">
          <span>
            <span>Ancho</span>
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
            <span>Caracteres</span>
          </span>
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

        <label className="control">
          <span>
            <span>Brillo</span>
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
            <span>Contraste</span>
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
            <span>Gamma</span>
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
            <span>Umbral bordes</span>
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
          label="Invertir"
          on={invert}
          disabled={disabled}
          onClick={() => onChange({ invert: !invert })}
        />
        <Toggle
          label="Color"
          on={colorMode}
          disabled={disabled}
          onClick={() => onChange({ colorMode: !colorMode })}
        />
        <Toggle
          label="Bordes"
          on={edges}
          disabled={disabled}
          onClick={() => onChange({ edges: !edges })}
        />
        <button
          type="button"
          className="btn-reset"
          disabled={disabled || ajustesNeutros}
          onClick={() => onChange({ brightness: 0, contrast: 0, gamma: 1 })}
        >
          Reiniciar ajustes
        </button>
      </div>
    </>
  );
}
