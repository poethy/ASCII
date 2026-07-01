import { estilosViz } from "../lib/audioViz";
import { paletas } from "../lib/palettes";

function formatear(s) {
  s = Math.max(0, s || 0);
  const m = Math.floor(s / 60);
  const seg = Math.floor(s % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
}

export default function AudioControls({
  playing,
  onTogglePlay,
  current,
  duration,
  onSeek,
  vizStyle,
  onStyleChange,
  palette,
  onPaletteChange,
  gain,
  onGainChange,
  onExport,
  exportando,
  progreso,
}) {
  const ocupado = !!exportando;
  return (
    <div className="transport">
      <div className="transport__row">
        <button
          type="button"
          className="transport__play"
          onClick={onTogglePlay}
          disabled={ocupado}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.05"
          value={current}
          disabled={ocupado}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
        <span className="transport__time">
          {formatear(current)} / {formatear(duration)}
        </span>
      </div>

      <div className="transport__row">
        <label className="control">
          <span>
            <span>Estilo</span>
          </span>
          <select
            value={vizStyle}
            disabled={ocupado}
            onChange={(e) => onStyleChange(e.target.value)}
          >
            {estilosViz.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="control">
          <span>
            <span>Paleta</span>
          </span>
          <select
            value={palette}
            disabled={ocupado}
            onChange={(e) => onPaletteChange(e.target.value)}
          >
            {paletas.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="control">
          <span>
            <span>Sensib.</span>
            <span>{gain.toFixed(1)}x</span>
          </span>
          <input
            type="range"
            min="0.2"
            max="4"
            step="0.1"
            value={gain}
            disabled={ocupado}
            onChange={(e) => onGainChange(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="transport__row">
        <button type="button" className="btn" onClick={onExport} disabled={ocupado}>
          Exportar WebM (con audio)
        </button>
        {ocupado && (
          <span className="transport__prog">
            Exportando… {Math.round(progreso * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
