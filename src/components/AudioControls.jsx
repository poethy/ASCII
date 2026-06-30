function formatear(s) {
  s = Math.max(0, s || 0);
  const m = Math.floor(s / 60);
  const seg = Math.floor(s % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
}

const ESTILOS = [
  { key: "spectrum", label: "Barras de espectro" },
  { key: "waveform", label: "Forma de onda" },
  { key: "mirror", label: "Barras espejo" },
];

export default function AudioControls({
  playing,
  onTogglePlay,
  current,
  duration,
  onSeek,
  vizStyle,
  onStyleChange,
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
            {ESTILOS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
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
