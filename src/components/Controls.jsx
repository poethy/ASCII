import { charsets } from "../lib/charsets";

export default function Controls({
  width,
  charsetKey,
  invert,
  colorMode,
  onChange,
  disabled,
}) {
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
    </div>
  );
}
