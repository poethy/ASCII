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
    <div className="videoctl">
      <div className="videoctl__fila">
        <button
          type="button"
          className="videoctl__play"
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
        <span className="videoctl__time">
          {formatear(current)} / {formatear(duration)}
        </span>
      </div>

      <div className="videoctl__fila">
        <label className="control">
          <span>Estilo</span>
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
          <span>Paleta</span>
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
          <span>Sensibilidad: {gain.toFixed(1)}x</span>
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

        <button type="button" onClick={onExport} disabled={ocupado}>
          Exportar WebM (con audio)
        </button>
        {ocupado && (
          <span className="videoctl__prog">
            Exportando… {Math.round(progreso * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
